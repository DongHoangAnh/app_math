import { generateQuestion } from "../questions";
import { ANSWER_MAX } from "../constants";
import type { PracticeOp } from "../types";

const opOf = (q: { type?: string; question: string }): string =>
    q.type === "comparison" ? "compare" : (q.question.match(/[+\-×÷]/)?.[0] ?? "?");

describe("generateQuestion — ops filter", () => {
    it("only addition when ops = [add]", () => {
        for (let i = 0; i < 80; i++) {
            const q = generateQuestion(2, { ops: ["add"] });
            expect(q.type).toBe("arithmetic");
            expect(opOf(q)).toBe("+");
        }
    });

    it("only comparison when ops = [compare]", () => {
        for (let i = 0; i < 50; i++) {
            const q = generateQuestion(2, { ops: ["compare"] });
            expect(q.type).toBe("comparison");
            expect(q.options).toEqual(["<", "=", ">"]);
        }
    });

    it("restricts to ×/÷ when ops = [mul, div]", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 120; i++) seen.add(opOf(generateQuestion(2, { ops: ["mul", "div"] })));
        expect([...seen].every((o) => o === "×" || o === "÷")).toBe(true);
    });

    it("arithmetic answers stay positive integers < ANSWER_MAX", () => {
        for (let i = 0; i < 200; i++) {
            const q = generateQuestion(3, { ops: ["add", "sub", "mul", "div"] });
            const n = Number(q.correctAnswer);
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(1);
            expect(n).toBeLessThan(ANSWER_MAX);
        }
    });

    it("arithmetic options include the correct answer (4 unique)", () => {
        for (let i = 0; i < 60; i++) {
            const q = generateQuestion(2, { ops: ["add", "sub"] });
            expect(q.options).toHaveLength(4);
            expect(new Set(q.options).size).toBe(4);
            expect(q.options).toContain(q.correctAnswer);
        }
    });

    it("defaults to all ops when none given", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 200; i++) seen.add(opOf(generateQuestion(2)));
        expect(seen.has("compare")).toBe(true);
        expect(seen.has("+")).toBe(true);
    });
});
