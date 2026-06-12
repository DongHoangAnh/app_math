import { normalizePracticeResult } from "../practice";

const good = JSON.stringify({
    config: { session: { kind: "endless" }, difficulty: 2, ramp: { enabled: true }, ops: ["add", "compare", "bogus"] },
    total: 12, correct: 9, totalTimeMs: 34000, bestStreak: 5, endedReason: "quit",
    perOp: { add: { attempted: 8, correct: 6 }, compare: { attempted: 4, correct: 3 } },
});

describe("normalizePracticeResult", () => {
    it("parses + clamps a valid body", () => {
        const r = normalizePracticeResult(good)!;
        expect(r.kind).toBe("endless");
        expect(r.difficultyStart).toBe(2);
        expect(r.rampEnabled).toBe(true);
        expect(r.ops).toEqual(["add", "compare"]); // "bogus" filtered out
        expect(r.total).toBe(12);
        expect(r.correct).toBe(9);
        expect(r.endedReason).toBe("quit");
        expect(r.perOp.add).toEqual({ attempted: 8, correct: 6 });
    });

    it("rejects empty/zero-total sessions", () => {
        expect(normalizePracticeResult(JSON.stringify({ total: 0 }))).toBeNull();
        expect(normalizePracticeResult(null)).toBeNull();
        expect(normalizePracticeResult("not json")).toBeNull();
    });

    it("clamps correct to total and per-op correct to attempted", () => {
        const r = normalizePracticeResult(JSON.stringify({
            config: { session: { kind: "fixed" }, difficulty: 9 },
            total: 5, correct: 99,
            perOp: { add: { attempted: 3, correct: 50 } },
        }))!;
        expect(r.correct).toBe(5);
        expect(r.difficultyStart).toBe(3); // clamped from 9
        expect(r.perOp.add).toEqual({ attempted: 3, correct: 3 });
    });

    it("defaults unknown kind/reason", () => {
        const r = normalizePracticeResult(JSON.stringify({ total: 1, config: { session: { kind: "x" } }, endedReason: "x" }))!;
        expect(r.kind).toBe("fixed");
        expect(r.endedReason).toBe("completed");
    });
});
