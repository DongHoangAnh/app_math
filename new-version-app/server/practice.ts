import type {
    PracticeOp, SessionKind, PracticeEndReason, OpTally,
} from "../shared/types";

export interface NormalizedPracticeResult {
    kind: SessionKind;
    difficultyStart: number;
    rampEnabled: boolean;
    ops: PracticeOp[];
    total: number;
    correct: number;
    totalTimeMs: number;
    bestStreak: number;
    endedReason: PracticeEndReason;
    perOp: Record<PracticeOp, OpTally>;
}

const KINDS = new Set<SessionKind>(["fixed", "endless", "timed"]);
const REASONS = new Set<PracticeEndReason>(["completed", "quit", "timeup"]);
const OPS: PracticeOp[] = ["add", "sub", "mul", "div", "compare"];

function clampInt(v: unknown, min: number, max: number): number {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
}

/** Parse an untrusted JSON body into a normalized result, or null if unusable.
 *  Returns null for empty sessions (total <= 0) — those are not persisted. */
export function normalizePracticeResult(raw: string | null): NormalizedPracticeResult | null {
    if (!raw) return null;
    let body: any;
    try { body = JSON.parse(raw); } catch { return null; }
    if (!body || typeof body !== "object") return null;

    const cfg = body.config ?? {};
    const kind: SessionKind = KINDS.has(cfg?.session?.kind) ? cfg.session.kind : "fixed";
    const endedReason: PracticeEndReason = REASONS.has(body.endedReason) ? body.endedReason : "completed";

    const total = clampInt(body.total, 0, 10_000);
    if (total <= 0) return null;
    const correct = clampInt(body.correct, 0, total);

    const ops = Array.isArray(cfg.ops)
        ? cfg.ops.filter((o: unknown): o is PracticeOp => OPS.includes(o as PracticeOp))
        : [];

    const perOp = {} as Record<PracticeOp, OpTally>;
    for (const op of OPS) {
        const t = body.perOp?.[op] ?? {};
        const attempted = clampInt(t.attempted, 0, total);
        perOp[op] = { attempted, correct: clampInt(t.correct, 0, attempted) };
    }

    return {
        kind,
        difficultyStart: clampInt(cfg.difficulty, 1, 3),
        rampEnabled: cfg?.ramp?.enabled === true,
        ops,
        total,
        correct,
        totalTimeMs: clampInt(body.totalTimeMs, 0, 86_400_000),
        bestStreak: clampInt(body.bestStreak, 0, total),
        endedReason,
        perOp,
    };
}
