import "dotenv/config";
import http from "http";
import { setupGameShowWS } from "./gameshow-ws";
import { testSupabaseConnection, getPlayerStats, getDailyTasks, claimTaskExp } from "./supabase-server";

const PORT = Number(process.env.PORT ?? 3000);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes("*");
const allowCredentials = process.env.CORS_CREDENTIALS === "true";

function getAllowOrigin(originHeader?: string) {
  if (allowAllOrigins) return "*";
  if (originHeader && allowedOrigins.includes(originHeader)) return originHeader;
  return allowedOrigins[0] ?? "*";
}

const server = http.createServer(async (req, res) => {
  const originHeader = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const allowOrigin = getAllowOrigin(originHeader);
  const requestHeaders =
    typeof req.headers["access-control-request-headers"] === "string"
      ? req.headers["access-control-request-headers"]
      : "Content-Type, Authorization";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  res.setHeader("Access-Control-Max-Age", "86400");
  if (allowOrigin !== "*" && allowCredentials) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url ?? "/", `http://localhost`);
  const pathname = parsedUrl.pathname;

  const statsMatch = pathname.match(/^\/api\/gameshow\/stats\/([^/]+)$/);
  const dailyTasksMatch = pathname.match(/^\/api\/daily-tasks\/([^/]+)$/);
  const claimTaskMatch = pathname.match(/^\/api\/daily-tasks\/([^/]+)\/claim\/([^/]+)$/);

  // GET /api/gameshow/stats/:userId
  if (req.method === "GET" && statsMatch) {
    const userId = statsMatch[1];
    try {
      const stats = await getPlayerStats(userId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats));
    } catch {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal" }));
    }
    return;
  }

  // GET /api/daily-tasks/:userId
  if (req.method === "GET" && dailyTasksMatch) {
    const userId = dailyTasksMatch[1];
    try {
      const tasks = await getDailyTasks(userId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tasks));
    } catch {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal" }));
    }
    return;
  }

  // POST /api/daily-tasks/:userId/claim/:taskKey
  if (req.method === "POST" && claimTaskMatch) {
    const userId = claimTaskMatch[1];
    const taskKey = claimTaskMatch[2];

    // Read body for displayName
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { displayName = "Player" } = body ? JSON.parse(body) : {};
        const result = await claimTaskExp(userId, taskKey, displayName);
        if (!result) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "task not claimable" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "internal" }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

setupGameShowWS(server);

server.listen(PORT, () => {
  console.log(`[GameShow] WebSocket server running on ws://localhost:${PORT}/ws/gameshow`);
  testSupabaseConnection();
});
