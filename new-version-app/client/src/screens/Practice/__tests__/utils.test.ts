import { applyRampStep, opOfQuestion, pickWeakOps, emptyPerOp, type RampState } from "../utils";
import type { RampConfig } from "../../../../../shared/types";

const RAMP: RampConfig = { enabled: true, upStreak: 10, downStreak: 3 };

describe("applyRampStep", () => {
    it("levels up after upStreak consecutive correct (caps at 3)", () => {
        let st: RampState = { difficulty: 1, correctStreak: 9, wrongStreak: 0 };
        const r = applyRampStep(st, true, RAMP);
        expect(r.change).toBe("up");
        expect(r.next.difficulty).toBe(2);
        expect(r.next.correctStreak).toBe(0);
    });

    it("does not exceed difficulty 3", () => {
        const st: RampState = { difficulty: 3, correctStreak: 9, wrongStreak: 0 };
        const r = applyRampStep(st, true, RAMP);
        expect(r.change).toBeNull();
        expect(r.next.difficulty).toBe(3);
    });

    it("levels down after downStreak consecutive wrong (floors at 1)", () => {
        const st: RampState = { difficulty: 2, correctStreak: 0, wrongStreak: 2 };
        const r = applyRampStep(st, false, RAMP);
        expect(r.change).toBe("down");
        expect(r.next.difficulty).toBe(1);
    });

    it("a correct answer resets the wrong streak", () => {
        const st: RampState = { difficulty: 2, correctStreak: 0, wrongStreak: 2 };
        expect(applyRampStep(st, true, RAMP).next.wrongStreak).toBe(0);
    });

    it("a wrong answer resets the correct streak", () => {
        const st: RampState = { difficulty: 1, correctStreak: 5, wrongStreak: 0 };
        expect(applyRampStep(st, false, RAMP).next.correctStreak).toBe(0);
    });
});

describe("opOfQuestion", () => {
    it("detects each op", () => {
        expect(opOfQuestion({ question: "2 + 3 = ?", correctAnswer: "5", type: "arithmetic" })).toBe("add");
        expect(opOfQuestion({ question: "9 - 3 = ?", correctAnswer: "6", type: "arithmetic" })).toBe("sub");
        expect(opOfQuestion({ question: "4 × 2 = ?", correctAnswer: "8", type: "arithmetic" })).toBe("mul");
        expect(opOfQuestion({ question: "8 ÷ 2 = ?", correctAnswer: "4", type: "arithmetic" })).toBe("div");
        expect(opOfQuestion({ question: "3  ?  5", correctAnswer: "<", type: "comparison" })).toBe("compare");
    });
});

describe("pickWeakOps", () => {
    it("returns null without enough samples", () => {
        expect(pickWeakOps(emptyPerOp(), 10)).toBeNull();
    });

    it("returns the lowest-accuracy ops first", () => {
        const p = emptyPerOp();
        p.add = { attempted: 20, correct: 18 };  // 0.90
        p.sub = { attempted: 20, correct: 10 };  // 0.50  ← weakest
        p.mul = { attempted: 20, correct: 14 };  // 0.70
        const weak = pickWeakOps(p, 10);
        expect(weak![0]).toBe("sub");
        expect(weak!.length).toBeLessThanOrEqual(2);
    });
});
