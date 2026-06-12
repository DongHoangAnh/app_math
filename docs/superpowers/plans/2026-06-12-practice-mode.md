# Practice Mode (Luyện tập đơn) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-player, unranked practice mode with configurable sessions (fixed / endless / timed), operation filters, ramp-up difficulty, weak-spot review, and progress tracking.

**Architecture:** Questions are generated on-device from a generator promoted to `shared/`; results persist over REST (`gameApi` → `authFetch`) to two new Supabase tables. No WebSocket (practice is solo, unranked). UI follows the glue-only folder pattern of `screens/GameShow/`, reusing `GameKeypad` / `ComparisonButtons` / `QuestionDisplay`.

**Tech Stack:** React Native (Expo) + TypeScript, Node `http` server, Supabase (PostgreSQL + RPC), Jest (jest-expo / tsx) for unit tests, Playwright for one E2E spec.

**Spec:** `docs/superpowers/specs/2026-06-12-practice-mode-design.md`

**Conventions discovered (follow exactly):**
- DB tables are created via SQL files in `server/migrations/` and accessed through the Supabase client in `server/supabase-server.ts`. `shared/schema.ts` (Drizzle) does NOT model the live tables (`game_matches`, `user_profiles`, …) and is **not** touched by this plan.
- Atomic counter bumps use a Postgres RPC (see `update_ranking_points`); we add `bump_practice_op_stats` the same way.
- Pure logic is unit-tested (see `server/__tests__/questions.test.ts`); UI is not unit-tested in this repo — UI tasks end in manual verification + commit.
- All emoji icons / SFX go through `ASSETS` (Code Pattern #6); env only via `config.ts`; REST only via `gameApi` (Code Pattern #3).

**Verification commands** (run from `new-version-app/`):
- Unit tests: `npm test`
- Type-check: `npx tsc --noEmit`
- E2E: `npm run test:e2e`

---

## Task 1: Shared practice types

**Files:**
- Modify: `new-version-app/shared/types.ts`

- [ ] **Step 1: Add the practice type block** to the end of `shared/types.ts`:

```ts
// ─── Practice mode (single-player, unranked) ────────────────
// One source of truth for the practice wire/config shapes, imported by the
// client play loop and the server persistence layer.

export type PracticeOp = "add" | "sub" | "mul" | "div" | "compare";
export type SessionKind = "fixed" | "endless" | "timed";
export type PracticeEndReason = "completed" | "quit" | "timeup";

export interface RampConfig {
    enabled: boolean;
    upStreak: number;   // consecutive correct to level up   (default 10)
    downStreak: number; // consecutive wrong to level down   (default 3)
}

export interface SessionSpec {
    kind: SessionKind;
    count?: number;     // for kind "fixed"
    seconds?: number;   // for kind "timed"
}

export interface TimerConfig {
    enabled: boolean;
    perQuestionSeconds?: number;
}

export interface PracticeConfig {
    ops: PracticeOp[];          // which operations may appear
    difficulty: GameDifficulty; // starting / fixed difficulty (1|2|3)
    ramp: RampConfig;
    session: SessionSpec;
    timer: TimerConfig;
    weakSpot?: boolean;         // seeded from the player's weak data
}

export interface OpTally { attempted: number; correct: number; }

export interface PracticeResult {
    config: PracticeConfig;
    total: number;
    correct: number;
    totalTimeMs: number;
    perOp: Record<PracticeOp, OpTally>;
    bestStreak: number;        // longest correct run (endless record)
    finalDifficulty: number;   // difficulty reached at end (ramp)
    endedReason: PracticeEndReason;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add new-version-app/shared/types.ts
git commit -m "feat(practice): add shared practice mode types"
```

---

## Task 2: Shared practice constants + presets

**Files:**
- Modify: `new-version-app/shared/constants.ts`
- Test: `new-version-app/shared/__tests__/practice-constants.test.ts`

- [ ] **Step 1: Add constants + a pure preset builder** to the end of `shared/constants.ts`. Add `PracticeOp, PracticeConfig, SessionKind` to the existing `import type { GameDifficulty } from "./types";` line:

```ts
import type { GameDifficulty, PracticeOp, PracticeConfig, SessionKind } from "./types";
```

Append:

```ts
// ─── Practice mode tunables ─────────────────────────────────
export const PRACTICE_OPS: PracticeOp[] = ["add", "sub", "mul", "div", "compare"];

// Vietnamese labels for each op (UI chips + per-op stats table).
export const PRACTICE_OP_LABELS: Record<PracticeOp, string> = {
    add: "Cộng (+)", sub: "Trừ (−)", mul: "Nhân (×)", div: "Chia (÷)", compare: "So sánh (< = >)",
};

export const RAMP_DEFAULT = { upStreak: 10, downStreak: 3 } as const;
export const RAMP_LIMITS = { up: { min: 5, max: 20 }, down: { min: 2, max: 5 } } as const;

export const TIMER_SPEEDS = [
    { id: "slow",   label: "Chậm",  seconds: 15 },
    { id: "normal", label: "Vừa",   seconds: 10 },
    { id: "fast",   label: "Nhanh", seconds: 5  },
] as const;

export const FIXED_COUNTS = [10, 20, 30] as const;
export const TIMED_SECONDS = [60, 120] as const;

export type PracticePresetId = "classic" | "endless" | "speed" | "weakspot" | "custom";

/** Build a fresh default config for a preset card. "custom" returns the classic
 *  baseline that the advanced screen then mutates. */
export function presetConfig(id: PracticePresetId): PracticeConfig {
    const base: PracticeConfig = {
        ops: [...PRACTICE_OPS],
        difficulty: 1,
        ramp: { enabled: false, upStreak: RAMP_DEFAULT.upStreak, downStreak: RAMP_DEFAULT.downStreak },
        session: { kind: "fixed", count: 10 },
        timer: { enabled: true, perQuestionSeconds: 10 },
        weakSpot: false,
    };
    switch (id) {
        case "classic":
            return base;
        case "endless":
            return { ...base, ramp: { ...base.ramp, enabled: true }, session: { kind: "endless" } };
        case "speed":
            return { ...base, session: { kind: "timed", seconds: 60 }, timer: { enabled: true, perQuestionSeconds: 5 } };
        case "weakspot":
            return { ...base, weakSpot: true };
        case "custom":
            return base;
    }
}
```

- [ ] **Step 2: Write the failing test** at `shared/__tests__/practice-constants.test.ts`:

```ts
import { presetConfig, PRACTICE_OPS, RAMP_DEFAULT } from "../constants";

describe("presetConfig", () => {
    it("classic: all ops, fixed 10, ramp off", () => {
        const c = presetConfig("classic");
        expect(c.ops).toEqual(PRACTICE_OPS);
        expect(c.session).toEqual({ kind: "fixed", count: 10 });
        expect(c.ramp.enabled).toBe(false);
    });

    it("endless: ramp on with default thresholds, endless session", () => {
        const c = presetConfig("endless");
        expect(c.session.kind).toBe("endless");
        expect(c.ramp.enabled).toBe(true);
        expect(c.ramp.upStreak).toBe(RAMP_DEFAULT.upStreak);
        expect(c.ramp.downStreak).toBe(RAMP_DEFAULT.downStreak);
    });

    it("speed: timed 60s, fast 5s per-question timer", () => {
        const c = presetConfig("speed");
        expect(c.session).toEqual({ kind: "timed", seconds: 60 });
        expect(c.timer).toEqual({ enabled: true, perQuestionSeconds: 5 });
    });

    it("weakspot: flag set", () => {
        expect(presetConfig("weakspot").weakSpot).toBe(true);
    });

    it("returns a fresh object each call (no shared mutation)", () => {
        const a = presetConfig("classic");
        a.ops.push("compare");
        expect(presetConfig("classic").ops).toEqual(PRACTICE_OPS);
    });
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `npm test -- practice-constants`
Expected: FAIL — `presetConfig is not a function` (if Step 1 not yet saved) or, if saved, PASS. If it already passes, that's fine; this test guards future edits.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- practice-constants`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add new-version-app/shared/constants.ts new-version-app/shared/__tests__/practice-constants.test.ts
git commit -m "feat(practice): add practice constants + preset builder"
```

---

## Task 3: Promote the question generator to `shared/` with op-filter support

**Files:**
- Create: `new-version-app/shared/questions.ts`
- Modify: `new-version-app/server/questions.ts` (becomes a thin re-export)
- Modify: `new-version-app/server/gameshow-ws.ts` (import path only — see Step 5)
- Test: `new-version-app/shared/__tests__/questions.test.ts`

> The existing `server/__tests__/questions.test.ts` keeps passing because `server/questions.ts` re-exports the same names. The new behavior (`generateQuestion` + ops filter) gets its own test in `shared/`.

- [ ] **Step 1: Create `shared/questions.ts`** with the moved logic plus the new `generateQuestion`:

```ts
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
```

- [ ] **Step 2: Write the failing test** at `shared/__tests__/questions.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- shared/__tests__/questions`
Expected: PASS (6 tests).

- [ ] **Step 4: Replace `server/questions.ts` with a re-export barrel** so PK + existing server tests are unchanged:

```ts
// Generation logic now lives in shared/ so the practice client can import it too.
// This barrel keeps the server's import paths (and existing tests) stable.
export { normalizeDifficulty, generateQuestion, generateQuestions } from "../shared/questions";
export type { ArithOp } from "../shared/questions";
```

- [ ] **Step 5: Verify `server/gameshow-ws.ts` imports still resolve.**

Run: `npm test -- server/__tests__/questions`
Expected: PASS (the existing suite, unchanged).

Then grep for any other importer:

Run: `npx grep -rn "from \"./questions\"" new-version-app/server` (or use the editor search). If `gameshow-ws.ts` imports `generateQuestions`/`normalizeDifficulty` from `./questions`, it still works via the barrel — no change needed.

- [ ] **Step 6: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/shared/questions.ts new-version-app/shared/__tests__/questions.test.ts new-version-app/server/questions.ts
git commit -m "refactor(questions): move generator to shared + add op-filtered generateQuestion"
```

---

## Task 4: Practice pure helpers (ramp, op detection, weak-spot)

**Files:**
- Create: `new-version-app/client/src/screens/Practice/utils.ts`
- Test: `new-version-app/client/src/screens/Practice/__tests__/utils.test.ts`

- [ ] **Step 1: Create `Practice/utils.ts`:**

```ts
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
```

- [ ] **Step 2: Write the failing test** at `Practice/__tests__/utils.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- Practice/__tests__/utils`
Expected: PASS (8 tests).

- [ ] **Step 4: Commit**

```bash
git add new-version-app/client/src/screens/Practice/utils.ts new-version-app/client/src/screens/Practice/__tests__/utils.test.ts
git commit -m "feat(practice): pure ramp/op-detect/weak-spot helpers"
```

---

## Task 5: SQL migration — practice tables + bump RPC

**Files:**
- Create: `new-version-app/server/migrations/009_practice_mode.sql`

- [ ] **Step 1: Create the migration file:**

```sql
-- ================================================================
-- Migration 009: Practice mode (single-player, unranked)
-- Run in Supabase SQL Editor AFTER migration 008
--
-- Two tables:
--   practice_sessions  — one row per finished session (history + records)
--   practice_op_stats  — rolling per-user×op aggregate (weak-spot + accuracy)
-- Plus bump_practice_op_stats() for atomic increment-or-insert.
-- Server uses the service-role key (bypasses RLS); RLS is enabled with no
-- policies so no anon/auth client can read or write these tables directly.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind             text NOT NULL,                       -- 'fixed' | 'endless' | 'timed'
  difficulty_start integer NOT NULL DEFAULT 1,
  ramp_enabled     boolean NOT NULL DEFAULT false,
  ops              jsonb NOT NULL DEFAULT '[]'::jsonb,
  total            integer NOT NULL DEFAULT 0,
  correct          integer NOT NULL DEFAULT 0,
  total_time_ms    integer NOT NULL DEFAULT 0,
  best_streak      integer NOT NULL DEFAULT 0,
  ended_reason     text NOT NULL DEFAULT 'completed',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_sessions_user_idx
  ON public.practice_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.practice_op_stats (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  op        text NOT NULL,                              -- 'add'|'sub'|'mul'|'div'|'compare'
  attempted integer NOT NULL DEFAULT 0,
  correct   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, op)
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_op_stats ENABLE ROW LEVEL SECURITY;

-- Atomic increment-or-insert of one op's tallies.
CREATE OR REPLACE FUNCTION public.bump_practice_op_stats(
  p_user_id   uuid,
  p_op        text,
  p_attempted integer,
  p_correct   integer
) RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.practice_op_stats (user_id, op, attempted, correct)
  VALUES (p_user_id, p_op, p_attempted, p_correct)
  ON CONFLICT (user_id, op) DO UPDATE
    SET attempted = public.practice_op_stats.attempted + EXCLUDED.attempted,
        correct   = public.practice_op_stats.correct   + EXCLUDED.correct;
$$;
```

- [ ] **Step 2: Note for the operator (no code).**

This migration must be run manually in the Supabase SQL Editor (same as 001–008). It cannot be unit-tested here. Record in the PR description that migration 009 needs to be applied before the practice endpoints work.

- [ ] **Step 3: Commit**

```bash
git add new-version-app/server/migrations/009_practice_mode.sql
git commit -m "feat(practice): SQL migration for practice tables + bump RPC"
```

---

## Task 6: Server — validate + persist practice results

**Files:**
- Create: `new-version-app/server/practice.ts` (pure validation/normalization — unit-tested)
- Modify: `new-version-app/server/supabase-server.ts` (DB functions)
- Test: `new-version-app/server/__tests__/practice.test.ts`

- [ ] **Step 1: Create `server/practice.ts`** (pure — parses/clamps an untrusted result body):

```ts
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
```

- [ ] **Step 2: Write the failing test** at `server/__tests__/practice.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- server/__tests__/practice`
Expected: PASS (4 tests).

- [ ] **Step 4: Add DB functions to `server/supabase-server.ts`** (append a new section at the end):

```ts
// ═══════════════════════════════════════════════════════════
// PRACTICE MODE (single-player, unranked)
// ═══════════════════════════════════════════════════════════

import type { PracticeOp, OpTally, SessionKind, PracticeEndReason } from "../shared/types";
import type { NormalizedPracticeResult } from "./practice";

export type PracticeSessionRow = {
    id: string;
    kind: SessionKind;
    difficultyStart: number;
    total: number;
    correct: number;
    totalTimeMs: number;
    endedReason: PracticeEndReason;
    createdAt: string;
};

export type PracticeSummary = {
    perOp: Record<PracticeOp, OpTally>;
    bestEndlessStreak: number;
    bestTimedScore: number;
};

const PRACTICE_OPS: PracticeOp[] = ["add", "sub", "mul", "div", "compare"];

export async function savePracticeSession(
    userId: string,
    r: NormalizedPracticeResult,
): Promise<void> {
    const db = getSupabaseClient();
    const { error } = await db.from("practice_sessions").insert({
        user_id: userId,
        kind: r.kind,
        difficulty_start: r.difficultyStart,
        ramp_enabled: r.rampEnabled,
        ops: r.ops,
        total: r.total,
        correct: r.correct,
        total_time_ms: r.totalTimeMs,
        best_streak: r.bestStreak,
        ended_reason: r.endedReason,
    });
    if (error) {
        console.error("[Supabase] insert practice_sessions error:", error.message);
        throw error;
    }

    // Bump per-op aggregates (atomic increment via RPC), only ops with attempts.
    await Promise.all(
        PRACTICE_OPS.filter((op) => r.perOp[op].attempted > 0).map((op) =>
            db.rpc("bump_practice_op_stats", {
                p_user_id: userId,
                p_op: op,
                p_attempted: r.perOp[op].attempted,
                p_correct: r.perOp[op].correct,
            }),
        ),
    );
}

export async function getPracticeSessions(
    userId: string,
    limit: number,
    offset: number,
): Promise<PracticeSessionRow[]> {
    const { data, error } = await getSupabaseClient()
        .from("practice_sessions")
        .select("id,kind,difficulty_start,total,correct,total_time_ms,ended_reason,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
    if (error || !data) return [];
    return data.map((s) => ({
        id: String(s.id),
        kind: s.kind,
        difficultyStart: s.difficulty_start ?? 1,
        total: s.total ?? 0,
        correct: s.correct ?? 0,
        totalTimeMs: s.total_time_ms ?? 0,
        endedReason: s.ended_reason ?? "completed",
        createdAt: s.created_at,
    }));
}

export async function getPracticeSummary(userId: string): Promise<PracticeSummary> {
    const db = getSupabaseClient();
    const perOp = {} as Record<PracticeOp, OpTally>;
    for (const op of PRACTICE_OPS) perOp[op] = { attempted: 0, correct: 0 };

    const { data: stats } = await db
        .from("practice_op_stats")
        .select("op,attempted,correct")
        .eq("user_id", userId);
    if (stats) {
        for (const row of stats) {
            if (PRACTICE_OPS.includes(row.op)) {
                perOp[row.op as PracticeOp] = { attempted: row.attempted ?? 0, correct: row.correct ?? 0 };
            }
        }
    }

    const { data: endless } = await db
        .from("practice_sessions")
        .select("best_streak")
        .eq("user_id", userId).eq("kind", "endless")
        .order("best_streak", { ascending: false }).limit(1);
    const { data: timed } = await db
        .from("practice_sessions")
        .select("correct")
        .eq("user_id", userId).eq("kind", "timed")
        .order("correct", { ascending: false }).limit(1);

    return {
        perOp,
        bestEndlessStreak: endless?.[0]?.best_streak ?? 0,
        bestTimedScore: timed?.[0]?.correct ?? 0,
    };
}
```

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/server/practice.ts new-version-app/server/supabase-server.ts new-version-app/server/__tests__/practice.test.ts
git commit -m "feat(practice): server validation + Supabase persistence"
```

---

## Task 7: Server — REST routes for practice

**Files:**
- Modify: `new-version-app/server/index.ts`

- [ ] **Step 1: Add imports** to the existing import block from `./supabase-server`:

```ts
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
    savePracticeSession,
    getPracticeSessions,
    getPracticeSummary,
} from "./supabase-server";
import { normalizePracticeResult } from "./practice";
```

- [ ] **Step 2: Add route matchers** next to the existing `const ...Match = pathname.match(...)` block:

```ts
    const practiceSessionsMatch = pathname.match(/^\/api\/practice\/sessions\/([^/]+)$/);
    const practiceSummaryMatch  = pathname.match(/^\/api\/practice\/summary\/([^/]+)$/);
```

- [ ] **Step 3: Add the three handlers** immediately before the final `json(res, 200, { status: "ok" });` line:

```ts
    // POST /api/practice/sessions  — save a finished session (own data only)
    if (req.method === "POST" && pathname === "/api/practice/sessions") {
        const authedId = await authenticate(req);
        if (!authedId) { json(res, 401, { error: "unauthorized" }); return; }
        const rawBody = await readBody(req);
        if (rawBody === null) { json(res, 413, { error: "payload too large" }); return; }
        const result = normalizePracticeResult(rawBody);
        if (!result) { json(res, 400, { error: "invalid result" }); return; }
        try {
            await savePracticeSession(authedId, result);
            json(res, 200, { ok: true });
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // GET /api/practice/sessions/:userId?limit=&offset=  — own history only
    if (req.method === "GET" && practiceSessionsMatch) {
        const userId = practiceSessionsMatch[1];
        if (!isValidUuid(userId)) { json(res, 400, { error: "invalid userId" }); return; }
        const authedId = await authenticate(req);
        if (!authedId || authedId !== userId) { json(res, 401, { error: "unauthorized" }); return; }
        const limitRaw  = Number(parsedUrl.searchParams.get("limit"));
        const offsetRaw = Number(parsedUrl.searchParams.get("offset"));
        const limit  = Number.isFinite(limitRaw)  ? Math.min(Math.max(Math.floor(limitRaw), 1), 20) : 10;
        const offset = Number.isFinite(offsetRaw) ? Math.max(Math.floor(offsetRaw), 0) : 0;
        try {
            json(res, 200, await getPracticeSessions(userId, limit, offset));
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }

    // GET /api/practice/summary/:userId  — own per-op accuracy + records
    if (req.method === "GET" && practiceSummaryMatch) {
        const userId = practiceSummaryMatch[1];
        if (!isValidUuid(userId)) { json(res, 400, { error: "invalid userId" }); return; }
        const authedId = await authenticate(req);
        if (!authedId || authedId !== userId) { json(res, 401, { error: "unauthorized" }); return; }
        try {
            json(res, 200, await getPracticeSummary(userId));
        } catch {
            json(res, 500, { error: "internal" });
        }
        return;
    }
```

> Note: `MAX_BODY_BYTES` is 2048. A 5-op `perOp` + config result is well under that. If the body ever grows (e.g. per-question logs are added later), raise the cap — but v1 stays small.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Smoke-test the server boots**

Run: `npm run server` (Ctrl-C after it logs the listening line)
Expected: logs `[GameShow] WebSocket server running ...` with no crash.

- [ ] **Step 6: Commit**

```bash
git add new-version-app/server/index.ts
git commit -m "feat(practice): REST routes for save/history/summary"
```

---

## Task 8: Client API layer — `gameApi` practice methods

**Files:**
- Modify: `new-version-app/client/src/services/api.ts`

- [ ] **Step 1: Add DTOs** after the existing `HeartbeatResult` interface:

```ts
import type { PracticeResult, PracticeOp, OpTally, SessionKind, PracticeEndReason } from '../../../shared/types';

export interface PracticeSessionDTO {
  id: string;
  kind: SessionKind;
  difficultyStart: number;
  total: number;
  correct: number;
  totalTimeMs: number;
  endedReason: PracticeEndReason;
  createdAt: string;
}

export interface PracticeSummaryDTO {
  perOp: Record<PracticeOp, OpTally>;
  bestEndlessStreak: number;
  bestTimedScore: number;
}
```

> If the linter flags `import type` placement, keep these imports at the top of the file with the other imports; the DTO interfaces stay in the DTO section.

- [ ] **Step 2: Add methods** to the `gameApi` object (before the closing `};`):

```ts
  savePracticeSession: (result: PracticeResult) =>
    request<{ ok: boolean }>(`/api/practice/sessions`, {
      method: 'POST',
      body: JSON.stringify(result),
    }),

  getPracticeSessions: (userId: string, limit = 10, offset = 0) =>
    request<PracticeSessionDTO[]>(
      `/api/practice/sessions/${userId}?limit=${limit}&offset=${offset}`,
    ),

  getPracticeSummary: (userId: string) =>
    request<PracticeSummaryDTO>(`/api/practice/summary/${userId}`),
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/client/src/services/api.ts
git commit -m "feat(practice): gameApi methods + DTOs"
```

---

## Task 9: ASSETS registry — practice icons

**Files:**
- Modify: `new-version-app/client/src/assets.ts`

- [ ] **Step 1: Add a `practice` key** to the `ASSETS` object (after `gameshow`):

```ts
  practice: {
    title: '🎯',
    classic: '📚',     // Cổ điển preset card
    endless: '♾️',     // Endless preset card
    speed: '⚡',       // Tốc độ preset card
    weakspot: '🩹',    // Ôn điểm yếu preset card
    custom: '🛠️',      // Tùy chỉnh preset card
    levelUp: '⬆️',     // ramp level-up indicator
    levelDown: '⬇️',   // ramp level-down indicator
    timer: '⏱️',
    correct: '✅',
    history: '📒',
    empty: '🗒️',
  },
```

- [ ] **Step 2: Update the header screen→asset map** comment block (add the line under `gameshow`):

```
//   practice      : screens/Practice/*.tsx + PracticeStatsScreen.tsx
```

- [ ] **Step 3: Verify the assets test still passes**

Run: `npm test -- assets`
Expected: PASS (`assets.test.ts` validates the registry shape).

- [ ] **Step 4: Commit**

```bash
git add new-version-app/client/src/assets.ts
git commit -m "feat(practice): register practice icons in ASSETS"
```

---

## Task 10: Practice shared styles

**Files:**
- Create: `new-version-app/client/src/screens/Practice/styles.ts`

- [ ] **Step 1: Create `Practice/styles.ts`** (shared StyleSheet; mirrors the warm/peach tokens used across the app):

```ts
import { StyleSheet } from 'react-native';
import { C, R, F, shadow } from '../../theme';

export const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  body:   { padding: 20, paddingBottom: 40, gap: 20 },

  // Headings
  h1: { fontFamily: F.displayBold, fontSize: 26, color: C.ink },
  h3: { fontFamily: F.display, fontSize: 18, color: C.ink, marginLeft: 2 },
  sub: { fontFamily: F.body, fontSize: 13, color: C.inkSlate },

  // Preset cards
  presetGrid: { gap: 12 },
  presetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.peachBorder,
    borderRadius: R.lg, padding: 16, ...shadow('#000', 1),
  },
  presetIconWrap: {
    width: 52, height: 52, borderRadius: R.md, backgroundColor: C.peachBg,
    justifyContent: 'center', alignItems: 'center',
  },
  presetName: { fontFamily: F.display, fontSize: 15, color: C.ink },
  presetDesc: { fontFamily: F.body, fontSize: 12, color: C.inkSlate, marginTop: 2 },

  // Knob sections (Tùy chỉnh)
  knobCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, padding: 16, gap: 12, ...shadow('#000', 1),
  },
  knobLabel: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.peachBorder, backgroundColor: C.surface,
  },
  chipOn: { backgroundColor: C.orange, borderColor: C.orange },
  chipTxt: { fontFamily: F.bodyMedium, fontSize: 13, color: C.inkBrown },
  chipTxtOn: { color: '#fff' },

  // Primary CTA
  cta: {
    backgroundColor: C.orange, borderRadius: R.pill, paddingVertical: 15,
    alignItems: 'center', ...shadow(C.orangeDark, 3),
  },
  ctaTxt: { fontFamily: F.display, fontSize: 16, color: '#fff' },

  // Play header
  playHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  diffPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.peachBg, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  diffPillTxt: { fontFamily: F.bodyBold, fontSize: 13, color: C.orangeDark },
  progressTxt: { fontFamily: F.bodyBold, fontSize: 14, color: C.inkSlate },
  timerTxt: { fontFamily: F.displayBold, fontSize: 18, color: C.orange },

  // Question card
  qCard: {
    backgroundColor: C.surface, borderRadius: R.lg, marginHorizontal: 20,
    paddingVertical: 36, alignItems: 'center', borderWidth: 1, borderColor: C.line,
    ...shadow('#000', 1),
  },
  questionText: { fontFamily: F.displayBold, fontSize: 40, color: C.ink },

  rampHint: { fontFamily: F.body, fontSize: 12, color: C.inkSlate, textAlign: 'center', marginTop: 10 },

  // Ramp overlay toast
  rampToast: {
    position: 'absolute', alignSelf: 'center', top: '38%',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: R.pill, ...shadow('#000', 3),
  },
  rampToastTxt: { fontFamily: F.displayBold, fontSize: 16, color: '#fff' },

  // Summary
  summaryWrap: { padding: 20, gap: 16 },
  bigStat: { fontFamily: F.displayBold, fontSize: 44, color: C.orange, textAlign: 'center' },
  statGrid: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, padding: 14, alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  statBoxLabel: { fontFamily: F.bodyMedium, fontSize: 11, color: C.inkSlate },
  statBoxValue: { fontFamily: F.displayBold, fontSize: 18, color: C.ink },

  // Per-op accuracy rows
  opRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  opName: { fontFamily: F.bodyMedium, fontSize: 14, color: C.inkBrown },
  opAcc:  { fontFamily: F.displayBold, fontSize: 14, color: C.ink },

  // Keypad reuse compatibility — Practice provides its own keys; reuse GameShow's
  // GameKeypad/ComparisonButtons which read from GameShow/styles. No styles needed here.

  secondaryBtn: {
    borderWidth: 1, borderColor: C.peachBorder, borderRadius: R.pill,
    paddingVertical: 13, alignItems: 'center', backgroundColor: C.surface,
  },
  secondaryTxt: { fontFamily: F.display, fontSize: 15, color: C.orangeDark },

  emptyTxt: { fontFamily: F.body, fontSize: 14, color: C.inkSlate, textAlign: 'center', marginTop: 24 },
});
```

> `GameKeypad` and `ComparisonButtons` import their styles from `screens/GameShow/styles` (`import { s } from './styles'`), so reusing them in Practice works without duplicating keypad styles. `QuestionDisplay` uses `s.questionText` from GameShow's styles too — Practice renders questions with its own `s.questionText` (above) via a local `<Text>` rather than importing `QuestionDisplay`, to avoid cross-folder style coupling. (See Task 12.)

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/client/src/screens/Practice/styles.ts
git commit -m "feat(practice): shared styles for practice screens"
```

---

## Task 11: ConfigPhase — preset cards + custom knobs

**Files:**
- Create: `new-version-app/client/src/screens/Practice/ConfigPhase.tsx`

- [ ] **Step 1: Create `ConfigPhase.tsx`:**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { s } from './styles';
import { ASSETS } from '../../assets';
import {
  PRACTICE_OPS, PRACTICE_OP_LABELS, TIMER_SPEEDS, FIXED_COUNTS, TIMED_SECONDS,
  RAMP_LIMITS, presetConfig, type PracticePresetId,
} from '../../../../shared/constants';
import { DIFFICULTIES } from '../../../../shared/constants';
import type { PracticeConfig, PracticeOp, SessionKind } from '../../../../shared/types';

const PRESETS: { id: PracticePresetId; name: string; desc: string; icon: string }[] = [
  { id: 'classic',  name: 'Cổ điển',     desc: 'Tự chọn số câu · đủ phép tính', icon: ASSETS.practice.classic },
  { id: 'endless',  name: 'Vô tận',      desc: 'Chơi đến khi dừng · độ khó tăng dần', icon: ASSETS.practice.endless },
  { id: 'speed',    name: 'Tốc độ',      desc: '60 giây · trả lời nhanh', icon: ASSETS.practice.speed },
  { id: 'weakspot', name: 'Ôn điểm yếu', desc: 'Luyện phép bạn hay sai', icon: ASSETS.practice.weakspot },
  { id: 'custom',   name: 'Tùy chỉnh',   desc: 'Chỉnh mọi thiết lập', icon: ASSETS.practice.custom },
];

interface Props {
  onStart: (config: PracticeConfig, preset: PracticePresetId) => void;
  weakOpsHint?: PracticeOp[] | null; // resolved weak ops, or null if not enough data
}

export default function ConfigPhase({ onStart, weakOpsHint }: Props) {
  const [editing, setEditing] = useState<PracticeConfig | null>(null);

  // Preset cards view
  if (!editing) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.h1}>{ASSETS.practice.title} Luyện tập</Text>
          <Text style={s.sub}>Chọn kiểu luyện tập để bắt đầu</Text>
          <View style={s.presetGrid}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.presetCard}
                activeOpacity={0.85}
                onPress={() => {
                  if (p.id === 'custom') { setEditing(presetConfig('custom')); return; }
                  onStart(presetConfig(p.id), p.id);
                }}
              >
                <View style={s.presetIconWrap}><Text style={{ fontSize: 26 }}>{p.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.presetName}>{p.name}</Text>
                  <Text style={s.presetDesc}>{p.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {weakOpsHint === null && (
            <Text style={s.sub}>Mẹo: chơi thêm vài phiên để mở khóa "Ôn điểm yếu" theo dữ liệu của bạn.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Custom knobs view
  const cfg = editing;
  const set = (patch: Partial<PracticeConfig>) => setEditing({ ...cfg, ...patch });
  const toggleOp = (op: PracticeOp) => {
    const has = cfg.ops.includes(op);
    const next = has ? cfg.ops.filter((o) => o !== op) : [...cfg.ops, op];
    if (next.length === 0) return; // keep at least one op
    set({ ops: next });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.h1}>{ASSETS.practice.custom} Tùy chỉnh</Text>

        {/* Ops filter */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Phép toán</Text>
          <View style={s.chipRow}>
            {PRACTICE_OPS.map((op) => {
              const on = cfg.ops.includes(op);
              return (
                <TouchableOpacity key={op} style={[s.chip, on && s.chipOn]} onPress={() => toggleOp(op)}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{PRACTICE_OP_LABELS[op]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Difficulty */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Độ khó bắt đầu</Text>
          <View style={s.chipRow}>
            {DIFFICULTIES.map((d) => {
              const on = cfg.difficulty === d.id && !cfg.ramp.enabled;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => set({ difficulty: d.id, ramp: { ...cfg.ramp, enabled: false } })}
                >
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{d.icon} {d.desc}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.chip, cfg.ramp.enabled && s.chipOn]}
              onPress={() => set({ ramp: { ...cfg.ramp, enabled: !cfg.ramp.enabled } })}
            >
              <Text style={[s.chipTxt, cfg.ramp.enabled && s.chipTxtOn]}>Tăng dần</Text>
            </TouchableOpacity>
          </View>
          {cfg.ramp.enabled && (
            <Text style={s.sub}>
              Đúng {cfg.ramp.upStreak} câu liên tiếp → lên cấp · Sai {cfg.ramp.downStreak} câu liên tiếp → xuống cấp
            </Text>
          )}
          {cfg.ramp.enabled && (
            <View style={s.chipRow}>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, upStreak: clampUp(cfg.ramp.upStreak - 1) } })}><Text style={s.chipTxt}>Lên −</Text></TouchableOpacity>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, upStreak: clampUp(cfg.ramp.upStreak + 1) } })}><Text style={s.chipTxt}>Lên +</Text></TouchableOpacity>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, downStreak: clampDown(cfg.ramp.downStreak - 1) } })}><Text style={s.chipTxt}>Xuống −</Text></TouchableOpacity>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, downStreak: clampDown(cfg.ramp.downStreak + 1) } })}><Text style={s.chipTxt}>Xuống +</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* Session kind */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Kiểu phiên</Text>
          <View style={s.chipRow}>
            {(['fixed', 'endless', 'timed'] as SessionKind[]).map((k) => {
              const on = cfg.session.kind === k;
              const label = k === 'fixed' ? 'Số câu' : k === 'endless' ? 'Vô tận' : 'Theo giờ';
              return (
                <TouchableOpacity key={k} style={[s.chip, on && s.chipOn]} onPress={() => set({ session: defaultSession(k) })}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {cfg.session.kind === 'fixed' && (
            <View style={s.chipRow}>
              {FIXED_COUNTS.map((n) => {
                const on = cfg.session.count === n;
                return (
                  <TouchableOpacity key={n} style={[s.chip, on && s.chipOn]} onPress={() => set({ session: { kind: 'fixed', count: n } })}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{n} câu</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {cfg.session.kind === 'timed' && (
            <View style={s.chipRow}>
              {TIMED_SECONDS.map((sec) => {
                const on = cfg.session.seconds === sec;
                return (
                  <TouchableOpacity key={sec} style={[s.chip, on && s.chipOn]} onPress={() => set({ session: { kind: 'timed', seconds: sec } })}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{sec}s</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Timer */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Giới hạn thời gian mỗi câu</Text>
          <View style={s.chipRow}>
            <TouchableOpacity
              style={[s.chip, !cfg.timer.enabled && s.chipOn]}
              onPress={() => set({ timer: { enabled: false } })}
            >
              <Text style={[s.chipTxt, !cfg.timer.enabled && s.chipTxtOn]}>Tắt</Text>
            </TouchableOpacity>
            {TIMER_SPEEDS.map((t) => {
              const on = cfg.timer.enabled && cfg.timer.perQuestionSeconds === t.seconds;
              return (
                <TouchableOpacity key={t.id} style={[s.chip, on && s.chipOn]} onPress={() => set({ timer: { enabled: true, perQuestionSeconds: t.seconds } })}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t.label} {t.seconds}s</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={s.cta} onPress={() => onStart(cfg, 'custom')} activeOpacity={0.9}>
          <Text style={s.ctaTxt}>Bắt đầu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => setEditing(null)} activeOpacity={0.85}>
          <Text style={s.secondaryTxt}>← Quay lại</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function clampUp(v: number) { return Math.min(Math.max(v, RAMP_LIMITS.up.min), RAMP_LIMITS.up.max); }
function clampDown(v: number) { return Math.min(Math.max(v, RAMP_LIMITS.down.min), RAMP_LIMITS.down.max); }
function defaultSession(kind: SessionKind) {
  return kind === 'fixed' ? { kind, count: 10 } : kind === 'timed' ? { kind, seconds: 60 } : { kind };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add new-version-app/client/src/screens/Practice/ConfigPhase.tsx
git commit -m "feat(practice): config phase — preset cards + custom knobs"
```

---

## Task 12: PlayPhase — question loop UI

**Files:**
- Create: `new-version-app/client/src/screens/Practice/PlayPhase.tsx`

- [ ] **Step 1: Create `PlayPhase.tsx`** (presentational; all state lives in the glue screen — Task 14). Reuses `GameKeypad` and `ComparisonButtons` from GameShow:

```tsx
import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { s } from './styles';
import { C } from '../../theme';
import { ASSETS } from '../../assets';
import { difficultyById } from '../../../../shared/constants';
import GameKeypad from '../GameShow/GameKeypad';
import ComparisonButtons from '../GameShow/ComparisonButtons';
import type { GameQuestion } from '../../../../shared/types';
import type { RampChange } from './utils';

interface Props {
  question: GameQuestion;
  difficulty: number;
  progressLabel: string;        // e.g. "3/10" or "Câu 7"
  timerEnabled: boolean;
  timer: number;
  numericInput: string;
  selectedAnswer: string | null;
  revealed: boolean;
  rampEnabled: boolean;
  rampHint?: string;            // e.g. "Đúng 7/10 để lên cấp"
  rampToast: RampChange;        // 'up' | 'down' | null — shows overlay
  toastOpacity: Animated.Value;
  onNumericKey: (k: string) => void;
  onNumericSubmit: () => void;
  onPickComparison: (op: string) => void;
  onQuit: () => void;
}

export default function PlayPhase({
  question, difficulty, progressLabel, timerEnabled, timer,
  numericInput, selectedAnswer, revealed, rampEnabled, rampHint,
  rampToast, toastOpacity, onNumericKey, onNumericSubmit, onPickComparison, onQuit,
}: Props) {
  const diff = difficultyById(difficulty);
  const isCompare = question.type === 'comparison';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.playHeader}>
        <TouchableOpacity onPress={onQuit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.secondaryTxt}>✕</Text>
        </TouchableOpacity>
        <View style={s.diffPill}>
          <Text style={{ fontSize: 14 }}>{diff.icon}</Text>
          <Text style={s.diffPillTxt}>{diff.label}</Text>
        </View>
        {timerEnabled
          ? <Text style={s.timerTxt}>{ASSETS.practice.timer} {timer}</Text>
          : <Text style={s.progressTxt}>{progressLabel}</Text>}
      </View>

      {timerEnabled && <Text style={[s.progressTxt, { textAlign: 'center' }]}>{progressLabel}</Text>}

      <View style={s.qCard}>
        <Text style={s.questionText}>{question.question}</Text>
      </View>

      {rampEnabled && !!rampHint && <Text style={s.rampHint}>{rampHint}</Text>}

      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {isCompare ? (
          <ComparisonButtons
            correctAnswer={question.correctAnswer}
            selectedAnswer={selectedAnswer}
            revealed={revealed}
            onPick={onPickComparison}
          />
        ) : (
          <GameKeypad
            value={numericInput}
            onKey={onNumericKey}
            onSubmit={onNumericSubmit}
            disabled={!!selectedAnswer}
          />
        )}
      </View>

      {/* Ramp level-change toast */}
      {rampToast && (
        <Animated.View
          style={[
            s.rampToast,
            { opacity: toastOpacity, backgroundColor: rampToast === 'up' ? C.success : C.inkSlate },
          ]}
        >
          <Text style={{ fontSize: 18 }}>
            {rampToast === 'up' ? ASSETS.practice.levelUp : ASSETS.practice.levelDown}
          </Text>
          <Text style={s.rampToastTxt}>
            {rampToast === 'up' ? `Lên ${difficultyById(difficulty).label}` : `Về ${difficultyById(difficulty).label}`}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/client/src/screens/Practice/PlayPhase.tsx
git commit -m "feat(practice): play phase UI (reuses keypad + comparison)"
```

---

## Task 13: SummaryPhase — end-of-session results

**Files:**
- Create: `new-version-app/client/src/screens/Practice/SummaryPhase.tsx`

- [ ] **Step 1: Create `SummaryPhase.tsx`:**

```tsx
import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { s } from './styles';
import { PRACTICE_OP_LABELS, PRACTICE_OPS } from '../../../../shared/constants';
import type { PracticeResult } from '../../../../shared/types';

interface Props {
  result: PracticeResult;
  onPlayAgain: () => void;
  onViewStats: () => void;
  onHome: () => void;
}

export default function SummaryPhase({ result, onPlayAgain, onViewStats, onHome }: Props) {
  const accuracy = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const avgSec = result.total > 0 ? (result.totalTimeMs / result.total / 1000).toFixed(1) : '0.0';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.summaryWrap}>
        <Text style={s.h1}>Kết quả</Text>
        <Text style={s.bigStat}>{result.correct}/{result.total}</Text>

        <View style={s.statGrid}>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>ĐỘ CHÍNH XÁC</Text>
            <Text style={s.statBoxValue}>{accuracy}%</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>TG/CÂU</Text>
            <Text style={s.statBoxValue}>{avgSec}s</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>CHUỖI ĐÚNG</Text>
            <Text style={s.statBoxValue}>{result.bestStreak}</Text>
          </View>
        </View>

        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Độ chính xác theo phép toán</Text>
          {PRACTICE_OPS.filter((op) => result.perOp[op].attempted > 0).map((op) => {
            const t = result.perOp[op];
            const acc = Math.round((t.correct / t.attempted) * 100);
            return (
              <View key={op} style={s.opRow}>
                <Text style={s.opName}>{PRACTICE_OP_LABELS[op]}</Text>
                <Text style={s.opAcc}>{t.correct}/{t.attempted} · {acc}%</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={s.cta} onPress={onPlayAgain} activeOpacity={0.9}>
          <Text style={s.ctaTxt}>Luyện tiếp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={onViewStats} activeOpacity={0.85}>
          <Text style={s.secondaryTxt}>Xem tiến bộ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={onHome} activeOpacity={0.85}>
          <Text style={s.secondaryTxt}>Về trang chủ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/client/src/screens/Practice/SummaryPhase.tsx
git commit -m "feat(practice): summary phase UI"
```

---

## Task 14: PracticeScreen — glue (state machine, timers, ramp, save)

**Files:**
- Create: `new-version-app/client/src/screens/PracticeScreen.tsx`

- [ ] **Step 1: Create `PracticeScreen.tsx`** (owns all state; routes config → playing → summary):

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useFeedback } from '../hooks/useFeedback';
import { gameApi } from '../services/api';
import { generateQuestion } from '../../../shared/questions';
import { presetConfig, type PracticePresetId } from '../../../shared/constants';
import type {
  PracticeConfig, PracticeResult, GameQuestion, GameDifficulty, PracticeEndReason,
} from '../../../shared/types';
import ConfigPhase from './Practice/ConfigPhase';
import PlayPhase from './Practice/PlayPhase';
import SummaryPhase from './Practice/SummaryPhase';
import {
  applyRampStep, opOfQuestion, emptyPerOp, pickWeakOps, type RampState, type RampChange,
} from './Practice/utils';

type Phase = 'config' | 'playing' | 'summary';

export default function PracticeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const fb = useFeedback();

  const [phase, setPhase] = useState<Phase>('config');
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [numericInput, setNumericInput] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [weakOpsHint, setWeakOpsHint] = useState<ReturnType<typeof pickWeakOps>>(undefined as any);

  // Mutable session accumulators (refs so timers read fresh values).
  const ramp = useRef<RampState>({ difficulty: 1, correctStreak: 0, wrongStreak: 0 });
  const perOp = useRef(emptyPerOp());
  const answered = useRef(0);
  const correctCount = useRef(0);
  const totalTimeMs = useRef(0);
  const bestStreak = useRef(0);
  const curStreak = useRef(0);
  const questionStart = useRef(0);
  const perQTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [difficulty, setDifficulty] = useState<GameDifficulty>(1);
  const [rampToast, setRampToast] = useState<RampChange>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    perQTimer.current && clearInterval(perQTimer.current);
    sessionTimer.current && clearInterval(sessionTimer.current);
    perQTimer.current = null;
    sessionTimer.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Resolve weak ops once for the config screen hint / weak-spot preset.
  useEffect(() => {
    if (!userId) return;
    gameApi.getPracticeSummary(userId)
      .then((sum) => setWeakOpsHint(pickWeakOps(sum.perOp)))
      .catch(() => setWeakOpsHint(null));
  }, [userId]);

  const buildResult = useCallback((reason: PracticeEndReason, cfg: PracticeConfig): PracticeResult => ({
    config: cfg,
    total: answered.current,
    correct: correctCount.current,
    totalTimeMs: totalTimeMs.current,
    perOp: perOp.current,
    bestStreak: bestStreak.current,
    finalDifficulty: ramp.current.difficulty,
    endedReason: reason,
  }), []);

  const endSession = useCallback((reason: PracticeEndReason, cfg: PracticeConfig) => {
    clearTimers();
    const res = buildResult(reason, cfg);
    if (res.total > 0) {
      setResult(res);
      setPhase('summary');
      if (userId) gameApi.savePracticeSession(res).catch(() => {});
    } else {
      setPhase('config'); // empty session discarded
    }
  }, [clearTimers, buildResult, userId]);

  const nextQuestion = useCallback((cfg: PracticeConfig) => {
    const q = generateQuestion(ramp.current.difficulty, { ops: cfg.ops });
    setQuestion(q);
    setNumericInput('');
    setSelectedAnswer(null);
    setRevealed(false);
    questionStart.current = Date.now();
    if (cfg.timer.enabled) {
      setTimer(cfg.timer.perQuestionSeconds ?? 10);
      perQTimer.current && clearInterval(perQTimer.current);
      perQTimer.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(perQTimer.current!);
            handleAnswer('__timeout__', cfg);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  }, []);

  const handleAnswer = useCallback((answer: string, cfg: PracticeConfig) => {
    if (selectedAnswer || revealed || !question) return;
    perQTimer.current && clearInterval(perQTimer.current);
    const wasCorrect = answer === question.correctAnswer;
    const op = opOfQuestion(question);

    perOp.current[op] = {
      attempted: perOp.current[op].attempted + 1,
      correct: perOp.current[op].correct + (wasCorrect ? 1 : 0),
    };
    answered.current += 1;
    totalTimeMs.current += Math.max(0, Date.now() - questionStart.current);
    if (wasCorrect) {
      correctCount.current += 1;
      curStreak.current += 1;
      bestStreak.current = Math.max(bestStreak.current, curStreak.current);
      fb.correct();
    } else {
      curStreak.current = 0;
      fb.wrong();
    }

    // Ramp
    let change: RampChange = null;
    if (cfg.ramp.enabled) {
      const r = applyRampStep(ramp.current, wasCorrect, cfg.ramp);
      ramp.current = r.next;
      change = r.change;
      setDifficulty(r.next.difficulty);
      if (change) showRampToast(change);
    }

    setSelectedAnswer(answer);
    setRevealed(true);

    // Advance after a short reveal, then check end conditions.
    setTimeout(() => {
      if (shouldEnd(cfg)) { endSession('completed', cfg); return; }
      nextQuestion(cfg);
    }, 600);
  }, [selectedAnswer, revealed, question, fb, nextQuestion, endSession]);

  const shouldEnd = (cfg: PracticeConfig): boolean => {
    if (cfg.session.kind === 'fixed') return answered.current >= (cfg.session.count ?? 10);
    return false; // endless ends on quit; timed ends on the session timer
  };

  const showRampToast = (change: RampChange) => {
    setRampToast(change);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setRampToast(null));
  };

  const startSession = useCallback((cfg: PracticeConfig, preset: PracticePresetId) => {
    // Resolve weak-spot ops if requested and we have data.
    let resolved = cfg;
    if (cfg.weakSpot && weakOpsHint) resolved = { ...cfg, ops: weakOpsHint };

    // Reset accumulators.
    ramp.current = { difficulty: resolved.difficulty, correctStreak: 0, wrongStreak: 0 };
    perOp.current = emptyPerOp();
    answered.current = 0; correctCount.current = 0; totalTimeMs.current = 0;
    bestStreak.current = 0; curStreak.current = 0;
    setDifficulty(resolved.difficulty);
    setConfig(resolved);
    setPhase('playing');
    nextQuestion(resolved);

    if (resolved.session.kind === 'timed') {
      setTimer(resolved.session.seconds ?? 60);
      sessionTimer.current && clearInterval(sessionTimer.current);
      sessionTimer.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(sessionTimer.current!); endSession('timeup', resolved); return 0; }
          return t - 1;
        });
      }, 1000);
    }
  }, [weakOpsHint, nextQuestion, endSession]);

  const onQuit = useCallback(() => {
    if (!config) return;
    Alert.alert('Dừng luyện tập?', 'Kết quả phần đã làm vẫn được lưu.', [
      { text: 'Tiếp tục', style: 'cancel' },
      { text: 'Dừng', style: 'destructive', onPress: () => endSession('quit', config) },
    ]);
  }, [config, endSession]);

  // ── Routing ──
  if (phase === 'config') {
    return <ConfigPhase onStart={startSession} weakOpsHint={weakOpsHint} />;
  }

  if (phase === 'playing' && question && config) {
    const rampHint = config.ramp.enabled
      ? `Đúng ${ramp.current.correctStreak}/${config.ramp.upStreak} để lên cấp`
      : undefined;
    const total = config.session.kind === 'fixed' ? (config.session.count ?? 10) : null;
    const progressLabel = config.session.kind === 'timed'
      ? `Đã làm ${answered.current}`
      : total ? `${answered.current + 1}/${total}` : `Câu ${answered.current + 1}`;
    return (
      <PlayPhase
        question={question}
        difficulty={difficulty}
        progressLabel={progressLabel}
        timerEnabled={config.timer.enabled || config.session.kind === 'timed'}
        timer={timer}
        numericInput={numericInput}
        selectedAnswer={selectedAnswer}
        revealed={revealed}
        rampEnabled={config.ramp.enabled}
        rampHint={rampHint}
        rampToast={rampToast}
        toastOpacity={toastOpacity}
        onNumericKey={(k) => {
          if (selectedAnswer) return;
          if (k === '⌫') setNumericInput((v) => v.slice(0, -1));
          else if (numericInput.length < 6) setNumericInput((v) => v + k);
        }}
        onNumericSubmit={() => { if (numericInput) handleAnswer(numericInput, config); }}
        onPickComparison={(op) => handleAnswer(op, config)}
        onQuit={onQuit}
      />
    );
  }

  if (phase === 'summary' && result) {
    return (
      <SummaryPhase
        result={result}
        onPlayAgain={() => setPhase('config')}
        onViewStats={() => navigation.navigate('PracticeStatsTab')}
        onHome={() => navigation.navigate('HomeTab')}
      />
    );
  }

  return null;
}
```

> The `weakOpsHint` state starts as `undefined` (loading), becomes `PracticeOp[]` or `null`. `ConfigPhase` treats `null` as "not enough data" and shows the hint; `undefined`/array render normally.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (If `weakOpsHint` typing complains, set its state type explicitly: `useState<import('./Practice/utils').default ...>` — simplest is `useState<ReturnType<typeof pickWeakOps> | undefined>(undefined)`.)

- [ ] **Step 3: Commit**

```bash
git add new-version-app/client/src/screens/PracticeScreen.tsx
git commit -m "feat(practice): glue screen — state machine, timers, ramp, save"
```

---

## Task 15: PracticeStatsScreen — history + records + per-op accuracy

**Files:**
- Create: `new-version-app/client/src/screens/PracticeStatsScreen.tsx`

- [ ] **Step 1: Create `PracticeStatsScreen.tsx`:**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { gameApi, type PracticeSessionDTO, type PracticeSummaryDTO } from '../services/api';
import { s } from './Practice/styles';
import { ASSETS } from '../assets';
import { PRACTICE_OP_LABELS, PRACTICE_OPS } from '../../../shared/constants';

const KIND_LABEL: Record<string, string> = { fixed: 'Số câu', endless: 'Vô tận', timed: 'Theo giờ' };

export default function PracticeStatsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [summary, setSummary] = useState<PracticeSummaryDTO | null>(null);
  const [sessions, setSessions] = useState<PracticeSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([gameApi.getPracticeSummary(userId), gameApi.getPracticeSessions(userId, 10, 0)])
      .then(([sum, sess]) => { setSummary(sum); setSessions(sess); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.h1}>{ASSETS.practice.history} Tiến bộ luyện tập</Text>

        {summary && (
          <View style={s.statGrid}>
            <View style={s.statBox}>
              <Text style={s.statBoxLabel}>KỶ LỤC VÔ TẬN</Text>
              <Text style={s.statBoxValue}>{summary.bestEndlessStreak}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statBoxLabel}>KỶ LỤC TỐC ĐỘ</Text>
              <Text style={s.statBoxValue}>{summary.bestTimedScore}</Text>
            </View>
          </View>
        )}

        {summary && (
          <View style={s.knobCard}>
            <Text style={s.knobLabel}>Độ chính xác theo phép toán</Text>
            {PRACTICE_OPS.map((op) => {
              const t = summary.perOp[op];
              const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : null;
              return (
                <View key={op} style={s.opRow}>
                  <Text style={s.opName}>{PRACTICE_OP_LABELS[op]}</Text>
                  <Text style={s.opAcc}>{acc === null ? '—' : `${acc}% (${t.attempted})`}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.h3}>Lịch sử gần đây</Text>
        {!loading && sessions.length === 0 && (
          <Text style={s.emptyTxt}>{ASSETS.practice.empty} Chưa có phiên luyện tập nào.</Text>
        )}
        {sessions.map((ss) => {
          const acc = ss.total > 0 ? Math.round((ss.correct / ss.total) * 100) : 0;
          return (
            <View key={ss.id} style={s.opRow}>
              <Text style={s.opName}>{KIND_LABEL[ss.kind] ?? ss.kind} · {new Date(ss.createdAt).toLocaleDateString('vi-VN')}</Text>
              <Text style={s.opAcc}>{ss.correct}/{ss.total} · {acc}%</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
```

> `new Date(ss.createdAt)` here is fine — it parses a server timestamp string (not the argless `Date.now()` that the workflow runtime forbids; this is normal app code).

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add new-version-app/client/src/screens/PracticeStatsScreen.tsx
git commit -m "feat(practice): stats screen — history, records, per-op accuracy"
```

---

## Task 16: Navigation + Home entry

**Files:**
- Modify: `new-version-app/client/src/App.tsx`
- Modify: `new-version-app/client/src/screens/HomeScreen.tsx`

- [ ] **Step 1: Import the new screens** in `App.tsx` (after the `MatchHistoryScreen` import):

```ts
import PracticeScreen       from './screens/PracticeScreen';
import PracticeStatsScreen  from './screens/PracticeStatsScreen';
```

- [ ] **Step 2: Register two hidden tabs** in `MainTabs()` (after the `MatchHistoryTab` `<Tab.Screen>`):

```tsx
      <Tab.Screen name="PracticeTab"      component={PracticeScreen}      options={{ tabBarLabel: 'Luyện Tập', tabBarButton: () => null, tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.practice.title} focused={focused} /> }} />
      <Tab.Screen name="PracticeStatsTab" component={PracticeStatsScreen} options={{ tabBarLabel: 'Tiến Bộ',   tabBarButton: () => null, tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.practice.history} focused={focused} /> }} />
```

- [ ] **Step 3: Add a "Luyện tập" section to `HomeScreen.tsx`.** After the closing `</View>` of the "PK difficulties" block (the `{/* ── PK difficulties ── */}` section ends around line 165), insert:

```tsx
        {/* ── Practice (solo learning) ── */}
        <View style={{ gap: 12 }}>
          <Text style={styles.h3}>Luyện tập</Text>
          <TouchableOpacity
            style={styles.practiceCard}
            onPress={() => navigation.navigate('PracticeTab')}
            activeOpacity={0.85}
          >
            <View style={styles.practiceIconWrap}>
              <Text style={{ fontSize: 26 }}>{ASSETS.practice.title}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.practiceName}>Luyện tập đơn</Text>
              <Text style={styles.practiceDesc}>Tự rèn · không tính điểm xếp hạng</Text>
            </View>
            <Text style={styles.practiceArrow}>→</Text>
          </TouchableOpacity>
        </View>
```

- [ ] **Step 4: Add the styles** to `HomeScreen.tsx`'s `StyleSheet.create({ ... })` (alongside the other entries):

```ts
  practiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.peachBorder,
    borderRadius: R.lg, padding: 16, ...shadow('#000', 1),
  },
  practiceIconWrap: {
    width: 52, height: 52, borderRadius: R.md, backgroundColor: C.peachBg,
    justifyContent: 'center', alignItems: 'center',
  },
  practiceName: { fontFamily: F.display, fontSize: 15, color: C.ink },
  practiceDesc: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate, marginTop: 2 },
  practiceArrow: { fontFamily: F.displayBold, fontSize: 20, color: C.orange },
```

- [ ] **Step 5: Also add a "Tiến bộ" entry to the "Khám phá" nav grid** (optional but per spec). In the `navGrid` `<View>`, the grid currently holds 4 `NavCard`s in a row; add a second row is overkill — instead leave the grid as-is and rely on the summary-screen link + Home practice card. (No change; documented so the executor doesn't add a 5th card that breaks the 4-up row layout.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Manual smoke test (web)**

Run: `npm run web`
Verify: Home shows a "Luyện tập" card → tapping it opens the preset cards → starting a "Cổ điển" session plays 10 questions → summary appears → "Xem tiến bộ" opens the stats screen.

- [ ] **Step 8: Commit**

```bash
git add new-version-app/client/src/App.tsx new-version-app/client/src/screens/HomeScreen.tsx
git commit -m "feat(practice): wire navigation + Home entry"
```

---

## Task 17: Retire the legacy client generator

**Files:**
- Delete: `new-version-app/client/src/services/questionGenerator.ts`

- [ ] **Step 1: Confirm no live imports.**

Run (editor search or): `npx grep -rn "questionGenerator" new-version-app/client new-version-app/shared new-version-app/server`
Expected: no matches outside the file itself. If any screen imports it, replace that usage with `generateQuestion` from `shared/questions` first.

- [ ] **Step 2: Delete the file.**

```bash
git rm new-version-app/client/src/services/questionGenerator.ts
```

- [ ] **Step 3: Type-check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (no broken imports).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(practice): remove legacy eval-based question generator"
```

---

## Task 18: E2E — practice happy path

**Files:**
- Create: `new-version-app/e2e/practice.spec.ts`

> Read `new-version-app/e2e/README.md` and an existing spec (e.g. `e2e/home.spec.ts` if present) first to match the login/setup helper and selector conventions. The skeleton below anchors to Vietnamese copy; adapt the auth bootstrap to the repo's existing helper.

- [ ] **Step 1: Create `e2e/practice.spec.ts`:**

```ts
import { test, expect } from '@playwright/test';
// If the repo has a shared auth helper (see other specs), import and use it here.

test.describe('Practice mode', () => {
  test('fixed session: start from preset → answer → summary', async ({ page }) => {
    await page.goto('/');
    // TODO(adapt): perform the same authenticated bootstrap the other specs use.

    // Open practice from Home.
    await page.getByText('Luyện tập đơn').click();

    // Choose the "Cổ điển" preset.
    await expect(page.getByText('Chọn kiểu luyện tập để bắt đầu')).toBeVisible();
    await page.getByText('Cổ điển').click();

    // Answer the first question via the keypad (tap a digit then ✓), looping a few times.
    // The exact answering loop depends on rendered questions; assert we eventually reach the summary.
    await expect(page.getByText('Kết quả')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Độ chính xác theo phép toán')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E spec**

Run: `npm run test:e2e -- practice`
Expected: PASS (after adapting the auth bootstrap + answering loop to the repo's helpers). If the answering loop needs concrete steps, fill them in based on the rendered keypad (digits are buttons with the number text; submit is `✓`).

- [ ] **Step 3: Commit**

```bash
git add new-version-app/e2e/practice.spec.ts
git commit -m "test(practice): e2e happy path for a fixed session"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- §2 architecture (client-gen + REST, no WS) → Tasks 3, 6, 7, 8.
- §2 shared generator move + delete legacy → Tasks 3, 17.
- §3 navigation + glue folder + reuse → Tasks 10–16.
- §4 data model (PracticeConfig/Result) → Tasks 1, 2.
- §5 play loop (3 session kinds, timer presets, ramp 10/3, quit-saves-partial, SFX) → Tasks 4, 14.
- §6 ramp feedback (pill, up/down toast, conditions shown) + thresholds by preset (custom editable) → Tasks 9, 11, 12, 14.
- §7 server/API/DB (2 tables + bump RPC, 3 endpoints, gameApi, weak-spot seeding) → Tasks 5, 6, 7, 8, 14.
- §8 progress surfaced (summary, per-op, history+records) → Tasks 13, 15.
- §9 testing (generator ops filter, ramp reducer, weak-spot, validation; one e2e) → Tasks 3, 4, 6, 18.
- Code Pattern #6 (ASSETS) → Task 9; difficulty icons reuse `DIFFICULTIES[].icon` → Tasks 11, 12.

**Deferred (per spec §1 non-goals):** trend chart, EXP/rank/daily-task hooks, custom number ranges, offline retry queue — intentionally not in any task.

**Type consistency check:** `PracticeConfig`, `PracticeResult`, `PracticeOp`, `OpTally`, `RampConfig` defined in Task 1 and used identically in Tasks 2/4/6/8/11/13/14. `generateQuestion(difficulty, { ops })` signature defined in Task 3, called in Task 14. `applyRampStep` / `opOfQuestion` / `pickWeakOps` / `emptyPerOp` defined in Task 4, used in Task 14. `gameApi.savePracticeSession/getPracticeSessions/getPracticeSummary` defined in Task 8, used in Tasks 14/15. Server `normalizePracticeResult` defined in Task 6, used in Task 7. DB column names in Task 5 match the `.insert`/`.select` keys in Task 6.
