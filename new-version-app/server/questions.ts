// ═══════════════════════════════════════════════════════════
// RANDOM QUESTION GENERATOR — lớp 1: +, -, ×, ÷ và so sánh <, >, =
//
// Chế độ chơi quyết định phép tính của câu số học. Câu so sánh (<, >, =)
// luôn xuất hiện ở mọi chế độ (cứ 3 câu thì có 1 câu so sánh).
// ═══════════════════════════════════════════════════════════

import type { GameQuestion, GameMode } from "../shared/types";

/** Coerce an untrusted mode string to a valid GameMode (default: mixed). */
export function normalizeMode(m?: string): GameMode {
    return m === "add_sub" || m === "mul_div" || m === "mixed" ? m : "mixed";
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

// Các phép tính được phép theo từng chế độ
function opsForMode(mode: GameMode): string[] {
    if (mode === "add_sub") return ["+", "-"];
    if (mode === "mul_div") return ["×", "÷"];
    return ["+", "-", "×", "÷"];
}

function makeArithmeticQ(mode: GameMode): GameQuestion {
    const op = shuffleArr(opsForMode(mode))[0];
    let a: number, b: number, answer: number, text: string;

    if (op === "+") {
        a = randInt(1, 9); b = randInt(1, 9);
        answer = a + b;
        text = `${a} + ${b} = ?`;
    } else if (op === "-") {
        a = randInt(1, 9); b = randInt(1, a);
        answer = a - b;
        text = `${a} - ${b} = ?`;
    } else if (op === "×") {
        a = randInt(1, 5); b = randInt(1, 5);
        answer = a * b;
        text = `${a} × ${b} = ?`;
    } else {
        b = randInt(2, 5); answer = randInt(1, 4);
        a = b * answer;
        text = `${a} ÷ ${b} = ?`;
    }

    return {
        id: nextQId(), level: 1, question: text,
        options: numericOptions(answer), correctAnswer: String(answer),
        difficulty: 1, type: "arithmetic",
    };
}

function makeComparisonQ(): GameQuestion {
    const a = randInt(1, 9), b = randInt(1, 9);
    const correct = a > b ? ">" : a < b ? "<" : "=";
    return {
        id: nextQId(), level: 1,
        question: `${a}  ?  ${b}`,
        options: ["<", "=", ">"],
        correctAnswer: correct,
        difficulty: 1,
        type: "comparison",
    };
}

// Tạo bộ câu hỏi: cứ mỗi 3 câu thì có 1 câu so sánh, còn lại là số học theo mode
export function generateQuestions(count: number, mode: GameMode): GameQuestion[] {
    return Array.from({ length: count }, (_, i) =>
        i % 3 === 2 ? makeComparisonQ() : makeArithmeticQ(mode)
    );
}
