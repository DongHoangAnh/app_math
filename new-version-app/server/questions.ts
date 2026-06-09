// ═══════════════════════════════════════════════════════════
// RANDOM QUESTION GENERATOR — +, -, ×, ÷ và so sánh <, >, =
//
// Mọi độ khó dùng cả 4 phép tính. Độ khó quyết định phạm vi toán hạng
// (0..max) còn đáp án LUÔN là số nguyên dương và < ANSWER_MAX (2000).
// Câu so sánh xuất hiện cứ 3 câu một lần (index % 3 === 2).
// ═══════════════════════════════════════════════════════════

import type { GameQuestion, GameDifficulty } from "../shared/types";
import { ANSWER_MAX, difficultyById } from "../shared/constants";

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

// Đáp án phải là số nguyên dương và < ANSWER_MAX cho MỌI độ khó.
const CAP = ANSWER_MAX - 1; // giá trị đáp án tối đa cho phép (1999)

function makeArithmeticQ(difficulty: GameDifficulty): GameQuestion {
    const { max } = difficultyById(difficulty);
    const op = shuffleArr(["+", "-", "×", "÷"])[0];
    let answer: number, text: string;

    if (op === "+") {
        const a = randInt(1, max);
        // giữ tổng < ANSWER_MAX: b không vượt CAP - a
        const b = randInt(1, Math.max(1, Math.min(max, CAP - a)));
        answer = a + b;
        text = `${a} + ${b} = ?`;
    } else if (op === "-") {
        const a = randInt(2, max);           // a ≥ 2 nên có chỗ cho hiệu ≥ 1
        const b = randInt(1, a - 1);          // hiệu nằm trong [1, max-1]
        answer = a - b;
        text = `${a} - ${b} = ?`;
    } else if (op === "×") {
        const a = randInt(1, max);
        // b sao cho tích < ANSWER_MAX và vẫn trong phạm vi độ khó
        const bMax = Math.max(1, Math.min(max, Math.floor(CAP / a)));
        const b = randInt(1, bMax);
        answer = a * b;
        text = `${a} × ${b} = ?`;
    } else {
        // chia hết: chọn số chia nhỏ (bảng cửu chương rộng) và thương trong phạm vi
        const b = randInt(2, Math.min(max, 12));
        const qMax = Math.max(1, Math.min(max, Math.floor(CAP / b)));
        answer = randInt(1, qMax);            // thương = đáp án
        const a = b * answer;                 // số bị chia (chia hết)
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
        difficulty,
        type: "comparison",
    };
}

// Tạo bộ câu hỏi: cứ mỗi 3 câu thì có 1 câu so sánh, còn lại là số học.
export function generateQuestions(count: number, difficulty: GameDifficulty): GameQuestion[] {
    return Array.from({ length: count }, (_, i) =>
        i % 3 === 2 ? makeComparisonQ(difficulty) : makeArithmeticQ(difficulty)
    );
}
