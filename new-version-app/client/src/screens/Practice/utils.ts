import type {
    GameDifficulty, PracticeOp, RampConfig, OpTally, GameQuestion,
} from "../../../../shared/types";

export interface RampState {
    difficulty: GameDifficulty;
    correctStreak: number;
    wrongStreak: number;
}

export type RampChange = "up" | "down" | null;

/** Apply one answer to the ramp state. Returns the next state + whether the
 *  difficulty changed. Caller invokes this only when ramp.enabled. */
export function applyRampStep(
    state: RampState,
    wasCorrect: boolean,
    ramp: RampConfig,
): { next: RampState; change: RampChange } {
    if (wasCorrect) {
        const correctStreak = state.correctStreak + 1;
        if (correctStreak >= ramp.upStreak && state.difficulty < 3) {
            return {
                next: { difficulty: (state.difficulty + 1) as GameDifficulty, correctStreak: 0, wrongStreak: 0 },
                change: "up",
            };
        }
        return { next: { ...state, correctStreak, wrongStreak: 0 }, change: null };
    }
    const wrongStreak = state.wrongStreak + 1;
    if (wrongStreak >= ramp.downStreak && state.difficulty > 1) {
        return {
            next: { difficulty: (state.difficulty - 1) as GameDifficulty, correctStreak: 0, wrongStreak: 0 },
            change: "down",
        };
    }
    return { next: { ...state, wrongStreak, correctStreak: 0 }, change: null };
}

const COMPARISON = new Set(["<", "=", ">"]);

/** Map a question to its PracticeOp (for per-op tallies). */
export function opOfQuestion(q: Pick<GameQuestion, "question" | "correctAnswer" | "type">): PracticeOp {
    if (q.type === "comparison" || COMPARISON.has(q.correctAnswer)) return "compare";
    if (q.question.includes("+")) return "add";
    if (q.question.includes("×")) return "mul";
    if (q.question.includes("÷")) return "div";
    return "sub"; // remaining arithmetic uses "-"
}

export const ALL_OPS: PracticeOp[] = ["add", "sub", "mul", "div", "compare"];

export function emptyPerOp(): Record<PracticeOp, OpTally> {
    return {
        add: { attempted: 0, correct: 0 },
        sub: { attempted: 0, correct: 0 },
        mul: { attempted: 0, correct: 0 },
        div: { attempted: 0, correct: 0 },
        compare: { attempted: 0, correct: 0 },
    };
}

/** Pick the 1–2 weakest ops by accuracy. Requires >= minSample attempts on an
 *  op to count it; returns null when not enough data anywhere. */
export function pickWeakOps(
    perOp: Record<PracticeOp, OpTally>,
    minSample = 10,
): PracticeOp[] | null {
    const eligible = ALL_OPS
        .filter((op) => perOp[op].attempted >= minSample)
        .map((op) => ({ op, acc: perOp[op].correct / perOp[op].attempted }))
        .sort((a, b) => a.acc - b.acc);
    if (eligible.length === 0) return null;
    return eligible.slice(0, 2).map((e) => e.op);
}
