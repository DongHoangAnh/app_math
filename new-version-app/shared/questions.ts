// ═══════════════════════════════════════════════════════════
// RANDOM QUESTION GENERATOR (shared by PK server + practice client)
//
// All difficulties use +, −, ×, ÷ and comparison < > =. Difficulty sets the
// operand range (0..max); answers are ALWAYS positive integers < ANSWER_MAX.
// PK uses generateQuestions() (comparison every 3rd slot). Practice uses
// generateQuestion() with an ops filter.
// ═══════════════════════════════════════════════════════════

import type { GameQuestion, GameDifficulty, PracticeOp } from "./types";
import { ANSWER_MAX, difficultyById } from "./constants";

export type ArithOp = "+" | "-" | "×" | "÷";
const ARITH_BY_OP: Record<"add" | "sub" | "mul" | "div", ArithOp> = {
    add: "+", sub: "-", mul: "×", div: "÷",
};

/** Coerce an untrusted difficulty value to 1 | 2 | 3 (default: 1). */
export function normalizeDifficulty(d?: number | string): GameDifficulty {
    const n = Number(d);
    return n === 1 || n === 2 || n === 3 ? (n as GameDifficulty) : 1;
}

let _qCounter = 0;
function nextQId() { return `q_${++_qCounter}`; }

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArr<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function numericOptions(correct: number): string[] {
    const pool = new Set<number>([correct]);
    for (const d of shuffleArr([1, 2, 3, -1, -2, 4, 5, -3, 10, -4])) {
        if (pool.size >= 4) break;
        const w = correct + d;
        if (w >= 0) pool.add(w);
    }
    let fill = correct + pool.size + 1;
    while (pool.size < 4) { pool.add(fill); fill++; }
    return shuffleArr([...pool].slice(0, 4).map(String));
}

const CAP = ANSWER_MAX - 1; // max allowed answer value (1999)

/** Arithmetic question constrained to the given operators (defaults to all 4). */
function makeArithmeticQ(difficulty: GameDifficulty, allowed: ArithOp[]): GameQuestion {
    const { max } = difficultyById(difficulty);
    const ops = allowed.length ? allowed : ["+", "-", "×", "÷"];
    const op = shuffleArr(ops)[0] as ArithOp;
    let answer: number, text: string;

    if (op === "+") {
        const a = randInt(1, max);
        const b = randInt(1, Math.max(1, Math.min(max, CAP - a)));
        answer = a + b;
        text = `${a} + ${b} = ?`;
    } else if (op === "-") {
        const a = randInt(2, max);
        const b = randInt(1, a - 1);
        answer = a - b;
        text = `${a} - ${b} = ?`;
    } else if (op === "×") {
        const a = randInt(1, max);
        const bMax = Math.max(1, Math.min(max, Math.floor(CAP / a)));
        const b = randInt(1, bMax);
        answer = a * b;
        text = `${a} × ${b} = ?`;
    } else {
        const b = randInt(2, Math.min(max, 12));
        const qMax = Math.max(1, Math.min(max, Math.floor(CAP / b)));
        answer = randInt(1, qMax);
        const a = b * answer;
        text = `${a} ÷ ${b} = ?`;
    }

    return {
        id: nextQId(), level: difficulty, question: text,
        options: numericOptions(answer), correctAnswer: String(answer),
        difficulty, type: "arithmetic",
    };
}

function makeComparisonQ(difficulty: GameDifficulty): GameQuestion {
    const { max } = difficultyById(difficulty);
    const a = randInt(0, max), b = randInt(0, max);
    const correct = a > b ? ">" : a < b ? "<" : "=";
    return {
        id: nextQId(), level: difficulty,
        question: `${a}  ?  ${b}`,
        options: ["<", "=", ">"],
        correctAnswer: correct,
        difficulty, type: "comparison",
    };
}

/** PK question set: comparison every 3rd slot (index % 3 === 2), rest arithmetic. */
export function generateQuestions(count: number, difficulty: GameDifficulty): GameQuestion[] {
    return Array.from({ length: count }, (_, i) =>
        i % 3 === 2 ? makeComparisonQ(difficulty) : makeArithmeticQ(difficulty, ["+", "-", "×", "÷"])
    );
}

/** Single question honoring a practice ops filter. If both arithmetic ops and
 *  "compare" are allowed, comparison appears ~1/3 of the time. */
export function generateQuestion(
    difficulty: GameDifficulty,
    opts?: { ops?: PracticeOp[] }
): GameQuestion {
    const ops = opts?.ops?.length ? opts.ops : ["add", "sub", "mul", "div", "compare"] as PracticeOp[];
    const arith = ops.filter((o): o is "add" | "sub" | "mul" | "div" => o !== "compare").map((o) => ARITH_BY_OP[o]);
    const canCompare = ops.includes("compare");

    if (canCompare && arith.length === 0) return makeComparisonQ(difficulty);
    if (canCompare && Math.random() < 1 / 3) return makeComparisonQ(difficulty);
    return makeArithmeticQ(difficulty, arith);
}
