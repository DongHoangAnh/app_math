import "dotenv/config";
import http from "http";
import { setupGameShowWS } from "./gameshow-ws";
import {
    testSupabaseConnection,
    getPlayerStats,
    getPublicProfile,
    getMatchHistory,
    getDailyTasks,
    claimTaskExp,
    verifyToken,
    acquireSessionLock,
    heartbeatSessionLock,
    releaseSessionLock,
} from "./supabase-server";
import { LOCK_TTL_SECONDS } from "../shared/constants";

const PORT = Number(process.env.PORT ?? 3000);
const MAX_BODY_BYTES = 2048;

// UUID v4 format check (prevents arbitrary string injection into DB queries)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s: string): boolean {
    return UUID_RE.test(s);
}

// Only accept known task keys — prevents arbitrary key enumeration / IDOR
const VALID_TASK_KEYS = new Set([
    "play_1", "play_3", "win_1", "correct_20", "accuracy_70",
]);

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes("*");
const allowCredentials = process.env.CORS_CREDENTIALS === "true";

function getAllowOrigin(originHeader?: string): string {
    if (allowAllOrigins) return "*";
    if (originHeader && allowedOrigins.includes(originHeader)) return originHeader;
    return allowedOrigins[0] ?? "";
}

// Security + CORS headers applied to every response
function applyHeaders(res: http.ServerResponse, originHeader?: string) {
    const allowOrigin = getAllowOrigin(originHeader);
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    if (allowOrigin !== "*" && allowCredentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
    }
    // Standard security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
}

function json(res: http.ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
}

// Extract and verify Bearer token; returns authed userId or null
async function authenticate(req: http.IncomingMessage): Promise<string | null> {
    const authHeader = typeof req.headers.authorization === "string"
        ? req.headers.authorization : "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    const user = await verifyToken(token);
    return user?.id ?? null;
}

// Read body with size cap; returns null on oversized payload
async function readBody(req: http.IncomingMessage): Promise<string | null> {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
            if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                resolve(null); // signal oversized
            }
        });
        req.on("end", () => resolve(body));
        req.on("error", () => resolve(null));
    });
}

// Parse { deviceId } from a request body; returns null if absent/invalid.
function parseDeviceId(raw: string | null): string | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.deviceId === "string" && parsed.deviceId.length > 0) {
            return parsed.deviceId.slice(0, 64);
        }
    } catch {
        /* fall through */
    }
    return null;
}

export function createApp() {
    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const originHeader = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    applyHeaders(res, originHeader);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = parsedUrl.pathname;

    const statsMatch     = pathname.match(/^\/api\/gameshow\/stats\/([^/]+)$/);
    const profileMatch   = pathname.match(/^\/api\/gameshow\/profile\/([^/]+)$/);
    const matchesMatch   = pathname.match(/^\/api\/gameshow\/matches\/([^/]+)$/);
    const dailyTasksMatch = pathname.match(/^\/api\/daily-tasks\/([^/]+)$/);
    const claimTaskMatch  = pathname.match(/^\/api\/daily-tasks\/([^/]+)\/claim\/([^/]+)$/);

    // GET /api/gameshow/stats/:userId  — public (leaderboard-style)
    if (req.method === "GET" && statsMatch) {
        const userId = statsMatch[1];
        if (!isValidUuid(userId)) {
            json(res, 400, { error: "invalid userId" });
            return;
        }
        try {
            const stats = await getPlayerStats(userId);
            json(res, 200, stats);
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // GET /api/gameshow/matches/:userId?limit=&offset=  — requires auth (own matches only)
    if (req.method === "GET" && matchesMatch) {
        const userId = matchesMatch[1];
        if (!isValidUuid(userId)) {
            json(res, 400, { error: "invalid userId" });
            return;
        }
        const authedId = await authenticate(req);
        if (!authedId || authedId !== userId) {
            json(res, 401, { error: "unauthorized" });
            return;
        }
        const limitRaw  = Number(parsedUrl.searchParams.get("limit"));
        const offsetRaw = Number(parsedUrl.searchParams.get("offset"));
        const limit  = Number.isFinite(limitRaw)  ? Math.min(Math.max(Math.floor(limitRaw), 1), 20) : 5;
        const offset = Number.isFinite(offsetRaw) ? Math.max(Math.floor(offsetRaw), 0) : 0;
        try {
            const matches = await getMatchHistory(userId, limit, offset);
            json(res, 200, matches);
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // GET /api/gameshow/profile/:userId  — requires auth (privacy-aware view of another player)
    if (req.method === "GET" && profileMatch) {
        const userId = profileMatch[1];
        if (!isValidUuid(userId)) {
            json(res, 400, { error: "invalid userId" });
            return;
        }
        const viewerId = await authenticate(req);
        if (!viewerId) {
            json(res, 401, { error: "unauthorized" });
            return;
        }
        try {
            const profile = await getPublicProfile(viewerId, userId);
            if (!profile) {
                json(res, 404, { error: "not found" });
                return;
            }
            json(res, 200, profile);
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // GET /api/daily-tasks/:userId  — requires auth (own tasks only)
    if (req.method === "GET" && dailyTasksMatch) {
        const userId = dailyTasksMatch[1];
        if (!isValidUuid(userId)) {
            json(res, 400, { error: "invalid userId" });
            return;
        }
        const authedId = await authenticate(req);
        if (!authedId || authedId !== userId) {
            json(res, 401, { error: "unauthorized" });
            return;
        }
        try {
            const tasks = await getDailyTasks(userId);
            json(res, 200, tasks);
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // POST /api/daily-tasks/:userId/claim/:taskKey  — requires auth (own tasks only)
    if (req.method === "POST" && claimTaskMatch) {
        const userId  = claimTaskMatch[1];
        const taskKey = claimTaskMatch[2];

        if (!isValidUuid(userId)) {
            json(res, 400, { error: "invalid userId" });
            return;
        }
        if (!VALID_TASK_KEYS.has(taskKey)) {
            json(res, 400, { error: "invalid taskKey" });
            return;
        }

        const authedId = await authenticate(req);
        if (!authedId || authedId !== userId) {
            json(res, 401, { error: "unauthorized" });
            return;
        }

        const rawBody = await readBody(req);
        if (rawBody === null) {
            json(res, 413, { error: "payload too large" });
            return;
        }

        let displayName = "Player";
        try {
            if (rawBody) {
                const parsed = JSON.parse(rawBody);
                if (typeof parsed.displayName === "string") {
                    displayName = parsed.displayName.slice(0, 30);
                }
            }
        } catch {
            // malformed JSON → use default displayName
        }

        try {
            const result = await claimTaskExp(userId, taskKey, displayName);
            if (!result) {
                json(res, 400, { error: "task not claimable" });
                return;
            }
            json(res, 200, result);
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // POST /api/session/acquire  — claim the single-device lock after login
    if (req.method === "POST" && pathname === "/api/session/acquire") {
        const authedId = await authenticate(req);
        if (!authedId) { json(res, 401, { error: "unauthorized" }); return; }
        const deviceId = parseDeviceId(await readBody(req));
        if (!deviceId) { json(res, 400, { error: "deviceId required" }); return; }
        try {
            const granted = await acquireSessionLock(authedId, deviceId, LOCK_TTL_SECONDS);
            json(res, 200, { granted });
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // POST /api/session/heartbeat  — keep the lock warm; owner:false => evicted
    if (req.method === "POST" && pathname === "/api/session/heartbeat") {
        const authedId = await authenticate(req);
        if (!authedId) { json(res, 401, { error: "unauthorized" }); return; }
        const deviceId = parseDeviceId(await readBody(req));
        if (!deviceId) { json(res, 400, { error: "deviceId required" }); return; }
        try {
            const owner = await heartbeatSessionLock(authedId, deviceId);
            json(res, 200, { owner });
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // POST /api/session/release  — explicit logout releases the lock
    if (req.method === "POST" && pathname === "/api/session/release") {
        const authedId = await authenticate(req);
        if (!authedId) { json(res, 401, { error: "unauthorized" }); return; }
        const deviceId = parseDeviceId(await readBody(req));
        if (!deviceId) { json(res, 400, { error: "deviceId required" }); return; }
        try {
            await releaseSessionLock(authedId, deviceId);
            json(res, 200, { ok: true });
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

        json(res, 200, { status: "ok" });
    };
}

const server = http.createServer(createApp());

setupGameShowWS(server);

server.listen(PORT, () => {
    console.log(`[GameShow] WebSocket server running on ws://localhost:${PORT}/ws/gameshow`);
    testSupabaseConnection();
});
