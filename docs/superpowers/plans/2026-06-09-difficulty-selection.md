# Difficulty Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the play-mode picker with a 3-level difficulty picker that changes the number range and the ranking-point multiplier, persisted on each match and shown in history.

**Architecture:** Difficulty is the single match axis. The client sends a numeric `difficulty` (1/2/3) on `JOIN_QUEUE`; the server picks the range-aware question set, matches by difficulty, and applies the point multiplier server-side. Difficulty is stored on `game_matches` so history shows the correct multiplied delta.

**Tech Stack:** TypeScript, React Native (Expo), Node `ws` WebSocket server, Supabase (Postgres), Jest.

**Working directory for all commands:** `D:\app_math\new-version-app` (run `cd new-version-app` first; tests live under `server/__tests__/`).

**Reference spec:** `docs/superpowers/specs/2026-06-09-difficulty-selection-design.md`

---

## Decisions locked from the spec

- Difficulty **replaces** mode. All questions are mixed `+ − × ÷` with a comparison every 3rd slot.
- Operand range by difficulty: D1 `0–10`, D2 `0–100`, D3 `0–1000`.
- **Global answer rule (all difficulties):** every answer is a **positive integer**, `1 ≤ answer < 2000`.
- Points (base +5 / −3) × multiplier, rounded with `Math.round` on magnitude: D1 +5/−3, D2 +8/−5, D3 +10/−6. Disconnect win uses the same multiplier.
- Matchmaking prefers same difficulty; the existing ~12 s fallback matches anyone, with the room's difficulty (and multiplier) following p1.
- Difficulty stored on `game_matches`; history recomputes `rankingDelta` with the stored difficulty's multiplier.

---

## File structure / change surface

- `shared/types.ts` — add `GameDifficulty`, remove `GameMode`.
- `shared/constants.ts` — replace `MODES`/`GameModeOption` with `DIFFICULTIES`/`DifficultyOption` + `ANSWER_MAX`, `difficultyById()`, `multiplierForDifficulty()`.
- `server/ranking.ts` — multiplier args on `outcomeDelta` / `computeRankingDeltas`.
- `server/questions.ts` — `normalizeDifficulty()` + range-aware `generateQuestions(count, difficulty)`.
- `server/gameshow-ws.ts` — difficulty in `JOIN_QUEUE`, `Player`, `GameRoom`; matchmaking by difficulty; multiplier through finish/disconnect.
- `server/supabase-server.ts` — `difficulty` on `GameMatchData`/insert; multiplier args; history maps difficulty + multiplied delta.
- `server/migrations/008_game_matches_difficulty.sql` — new column.
- `client/src/hooks/useGameShowWS.ts` — `joinQueue(difficulty)`, store match difficulty.
- `client/src/screens/GameShow/IdlePhase.tsx` — difficulty cards.
- `client/src/screens/GameShowScreen.tsx` — `selectedDifficulty` + route param.
- `client/src/screens/HomeScreen.tsx` — PK quick-cards → difficulties.
- `client/src/services/api.ts` — `difficulty` on `MatchHistoryItem`.
- `client/src/screens/MatchHistoryScreen.tsx` — difficulty badge.
- Tests: `ranking.test.ts`, `questions.test.ts`, `gameshow-ws.integration.test.ts`.

---

## Task 1: Ranking multiplier (pure, TDD)

**Files:**
- Modify: `server/ranking.ts`
- Test: `server/__tests__/ranking.test.ts`

- [ ] **Step 1: Add failing tests for the multiplier**

Append inside `server/__tests__/ranking.test.ts` (before the final closing of the file, after the existing `computeRankingDeltas` describe block):

```typescript
describe('ranking — multiplier', () => {
  it('rounds win/lose by the difficulty multiplier (half-up on magnitude)', () => {
    // D2 ×1.5 → 7.5→8 win, 4.5→5 lose
    expect(outcomeDelta('win', 1.5)).toBe(8);
    expect(outcomeDelta('lose', 1.5)).toBe(-5);
    // D3 ×2 → 10 win, 6 lose
    expect(outcomeDelta('win', 2)).toBe(10);
    expect(outcomeDelta('lose', 2)).toBe(-6);
    // Draw is always zero regardless of multiplier
    expect(outcomeDelta('draw', 2)).toBe(0);
  });

  it('defaults to multiplier 1 when omitted', () => {
    expect(outcomeDelta('win')).toBe(5);
    expect(outcomeDelta('lose')).toBe(-3);
  });

  it('computeRankingDeltas applies the multiplier to both players', () => {
    expect(computeRankingDeltas('p1', 'p1', 'p2', 1.5)).toEqual({
      player1Delta: 8,
      player2Delta: -5,
    });
    expect(computeRankingDeltas('p2', 'p1', 'p2', 2)).toEqual({
      player1Delta: -6,
      player2Delta: 10,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest server/__tests__/ranking.test.ts`
Expected: FAIL — the existing `outcomeDelta('win', 1.5)` returns `5` (multiplier arg ignored).

- [ ] **Step 3: Add multiplier support in `server/ranking.ts`**

Replace the `outcomeDelta` and `computeRankingDeltas` functions with:

```typescript
/** Ranking points delta for a single player given their match outcome. */
export function outcomeDelta(outcome: RankingOutcome, multiplier = 1): number {
    if (outcome === "win") return Math.round(POINTS_WIN * multiplier);
    if (outcome === "lose") return -Math.round(POINTS_LOSE * multiplier);
    return 0; // draw
}

/**
 * Both players' ranking deltas from the winner id, scaled by the match multiplier.
 * null winner = draw → both 0.
 */
export function computeRankingDeltas(
    winnerId: string | null,
    player1Id: string,
    player2Id: string,
    multiplier = 1,
): { player1Delta: number; player2Delta: number } {
    if (winnerId === player1Id) {
        return { player1Delta: outcomeDelta("win", multiplier), player2Delta: outcomeDelta("lose", multiplier) };
    }
    if (winnerId === player2Id) {
        return { player1Delta: outcomeDelta("lose", multiplier), player2Delta: outcomeDelta("win", multiplier) };
    }
    return { player1Delta: 0, player2Delta: 0 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest server/__tests__/ranking.test.ts`
Expected: PASS (all old + new cases).

- [ ] **Step 5: Commit**

```bash
git add server/ranking.ts server/__tests__/ranking.test.ts
git commit -m "feat(ranking): difficulty point multiplier on outcome deltas"
```

---

## Task 2: Shared difficulty type + constants

**Files:**
- Modify: `shared/types.ts`
- Modify: `shared/constants.ts`

This removes `GameMode`/`MODES`; consumers are updated in Tasks 3–10. Full-project typecheck is green again after Task 10 — intermediate verification here is scoped to the two edited files.

- [ ] **Step 1: Add `GameDifficulty`, remove `GameMode` in `shared/types.ts`**

Replace the `GameMode` declaration (the `export type GameMode = ...` line and its comment) with:

```typescript
// Difficulty chosen at queue time. Decides the operand range and the ranking
// point multiplier. All difficulties use mixed operations (+ − × ÷).
export type GameDifficulty = 1 | 2 | 3;
```

- [ ] **Step 2: Replace `MODES` with `DIFFICULTIES` in `shared/constants.ts`**

Change the import line at the top from:

```typescript
import type { GameMode } from "./types";
```

to:

```typescript
import type { GameDifficulty } from "./types";
```

Then replace the entire `// ─── Play modes ───` block (the `GameModeOption` interface and the `MODES` array) with:

```typescript
// ─── Difficulty levels (client picker + server question gen / scoring) ──────
export interface DifficultyOption {
    id: GameDifficulty;
    label: string;      // "Độ khó 1"
    desc: string;       // short chip ("Dễ")
    detail: string;     // one-line description (lobby cards)
    icon: string;
    max: number;        // operand range upper bound (0..max)
    multiplier: number; // ranking-point coefficient
}
export const DIFFICULTIES: DifficultyOption[] = [
    { id: 1, label: "Độ khó 1", desc: "Dễ",  detail: "Số 0–10 · + − × ÷ · điểm thường", icon: "🟢", max: 10,   multiplier: 1 },
    { id: 2, label: "Độ khó 2", desc: "Vừa", detail: "Số 0–100 · + − × ÷ · điểm ×1.5",  icon: "🟡", max: 100,  multiplier: 1.5 },
    { id: 3, label: "Độ khó 3", desc: "Khó", detail: "Số 0–1000 · + − × ÷ · điểm ×2",   icon: "🔴", max: 1000, multiplier: 2 },
];

// Every generated answer is a positive integer strictly below this, for all difficulties.
export const ANSWER_MAX = 2000;

/** Look up a difficulty option by id; falls back to the easiest (1) for unknown ids. */
export function difficultyById(id: number): DifficultyOption {
    return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
}

/** Ranking-point multiplier for a difficulty id (defaults to 1). */
export function multiplierForDifficulty(id: number): number {
    return difficultyById(id).multiplier;
}
```

- [ ] **Step 2b: Confirm the two files have no syntax errors**

Run: `npx tsc --noEmit shared/types.ts shared/constants.ts`
Expected: no errors reported for these two files (errors elsewhere are expected until Task 10).

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts shared/constants.ts
git commit -m "feat(shared): DIFFICULTIES + multiplier helpers, drop GameMode/MODES"
```

---

## Task 3: Range-aware question generator (TDD)

**Files:**
- Modify: `server/questions.ts`
- Test: `server/__tests__/questions.test.ts`

- [ ] **Step 1: Replace the question test for the difficulty API**

Replace the entire contents of `server/__tests__/questions.test.ts` with:

```typescript
import { normalizeDifficulty, generateQuestions } from '../questions';
import { QUESTIONS_PER_MATCH, ANSWER_MAX, DIFFICULTIES } from '../../shared/constants';
import type { GameDifficulty } from '../../shared/types';

describe('questions — normalizeDifficulty', () => {
  it('passes through valid difficulties 1/2/3', () => {
    expect(normalizeDifficulty(1)).toBe(1);
    expect(normalizeDifficulty(2)).toBe(2);
    expect(normalizeDifficulty(3)).toBe(3);
    expect(normalizeDifficulty('2')).toBe(2); // numeric strings coerced
  });

  it('defaults unknown / missing input to 1', () => {
    expect(normalizeDifficulty(undefined)).toBe(1);
    expect(normalizeDifficulty(0)).toBe(1);
    expect(normalizeDifficulty(4)).toBe(1);
    expect(normalizeDifficulty('garbage')).toBe(1);
  });
});

describe('questions — generateQuestions', () => {
  const LEVELS: GameDifficulty[] = [1, 2, 3];

  it('returns exactly the requested count', () => {
    expect(generateQuestions(QUESTIONS_PER_MATCH, 1)).toHaveLength(QUESTIONS_PER_MATCH);
    expect(generateQuestions(0, 1)).toHaveLength(0);
    expect(generateQuestions(25, 3)).toHaveLength(25);
  });

  it('places a comparison question at every 3rd slot (index % 3 === 2)', () => {
    const qs = generateQuestions(12, 2);
    qs.forEach((q, i) => {
      expect(q.type).toBe(i % 3 === 2 ? 'comparison' : 'arithmetic');
    });
  });

  it('gives every question a unique id', () => {
    const qs = generateQuestions(30, 3);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  });

  it('tags each question with its difficulty', () => {
    for (const d of LEVELS) {
      for (const q of generateQuestions(9, d)) expect(q.difficulty).toBe(d);
    }
  });

  describe('arithmetic answers obey the global rule (positive integer < 2000)', () => {
    it('holds for every difficulty', () => {
      for (const d of LEVELS) {
        const qs = generateQuestions(120, d).filter((q) => q.type === 'arithmetic');
        expect(qs.length).toBeGreaterThan(0);
        for (const q of qs) {
          const n = Number(q.correctAnswer);
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThan(ANSWER_MAX);
        }
      }
    });

    it('has 4 unique options including the correct answer', () => {
      const qs = generateQuestions(120, 3).filter((q) => q.type === 'arithmetic');
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.correctAnswer);
      }
    });

    it('uses all four operators across a large sample', () => {
      const ops = new Set(
        generateQuestions(150, 2)
          .filter((q) => q.type === 'arithmetic')
          .map((q) => q.question.match(/[+\-×÷]/)?.[0] ?? ''),
      );
      expect([...ops].sort()).toEqual(['+', '-', '×', '÷'].sort());
    });
  });

  describe('comparison questions', () => {
    it('offer exactly the three comparison operators with a valid answer', () => {
      const qs = generateQuestions(60, 2).filter((q) => q.type === 'comparison');
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) {
        expect(q.options).toEqual(['<', '=', '>']);
        expect(q.options).toContain(q.correctAnswer);
      }
    });

    it('keeps comparison operands within the difficulty range', () => {
      const max = DIFFICULTIES.find((d) => d.id === 1)!.max; // 10
      const qs = generateQuestions(60, 1).filter((q) => q.type === 'comparison');
      for (const q of qs) {
        const nums = q.question.match(/\d+/g)!.map(Number);
        for (const n of nums) expect(n).toBeLessThanOrEqual(max);
      }
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest server/__tests__/questions.test.ts`
Expected: FAIL — `normalizeDifficulty` is not exported and `generateQuestions` still takes a mode.

- [ ] **Step 3: Rewrite `server/questions.ts`**

Replace the entire contents of `server/questions.ts` with:

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest server/__tests__/questions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/questions.ts server/__tests__/questions.test.ts
git commit -m "feat(questions): range-aware generation by difficulty, answer < 2000"
```

---

## Task 4: WebSocket server — difficulty plumbing + matchmaking

**Files:**
- Modify: `server/gameshow-ws.ts`

- [ ] **Step 1: Update imports**

Change the import lines near the top of `server/gameshow-ws.ts`:

```typescript
import type { GameQuestion, AnswerRecord, GameDifficulty } from "../shared/types";
import { QUESTIONS_PER_MATCH, CHAT_MAX_LEN, multiplierForDifficulty } from "../shared/constants";
import { generateQuestions, normalizeDifficulty } from "./questions";
```

(Removes the old `normalizeMode` import; replaces the `../shared/types` and `../shared/constants` imports.)

- [ ] **Step 2: Swap `mode` → `difficulty` on `Player`, `GameRoom`, and `WSMessage`**

In the `Player` interface, replace `mode?: string;` with:

```typescript
    difficulty?: number;
```

In the `GameRoom` interface, add after `questions: GameQuestion[];`:

```typescript
    difficulty: GameDifficulty;
```

In the `WSMessage` union, change the `JOIN_QUEUE` member's `mode?: string` to `difficulty?: number`:

```typescript
    | { type: "JOIN_QUEUE"; userId: string; token: string; displayName: string; grade?: string; winRate?: number; totalScore?: number; difficulty?: number; deviceId?: string }
```

- [ ] **Step 3: Use difficulty in `createRoom`**

In `createRoom`, replace the two lines that compute mode/questions:

```typescript
    // Dùng chế độ của người vào hàng đợi trước (p1) để cả hai cùng một bộ câu hỏi
    const mode = normalizeMode(p1.mode);
    const questions = generateQuestions(QUESTIONS_PER_MATCH, mode);
```

with:

```typescript
    // Độ khó của người vào hàng đợi trước (p1) quyết định bộ câu hỏi + hệ số điểm cho cả hai
    const difficulty = normalizeDifficulty(p1.difficulty);
    const questions = generateQuestions(QUESTIONS_PER_MATCH, difficulty);
```

In the same function, add `difficulty,` to the `room` object literal (right after `questions,`):

```typescript
        questions,
        difficulty,
```

Add `difficulty` to BOTH `MATCH_FOUND` payloads (so the client can show the multiplier). In each `sendToPlayer(..., { type: "MATCH_FOUND", roomId, questions, opponent: {...} })`, add `difficulty,` after `questions,`:

```typescript
        type: "MATCH_FOUND",
        roomId,
        questions,
        difficulty,
```

- [ ] **Step 4: Match by difficulty in `tryMatch`**

In `tryMatch` Pass 1, replace the mode comparison:

```typescript
        const mode1 = normalizeMode(waitingQueue[i].mode);
        for (let j = i + 1; j < waitingQueue.length; j++) {
            if (normalizeMode(waitingQueue[j].mode) === mode1) {
```

with:

```typescript
        const diff1 = normalizeDifficulty(waitingQueue[i].difficulty);
        for (let j = i + 1; j < waitingQueue.length; j++) {
            if (normalizeDifficulty(waitingQueue[j].difficulty) === diff1) {
```

(Pass 2 fallback is unchanged — p1 still decides via `createRoom`.)

- [ ] **Step 5: Apply the multiplier on finish**

In `finishGame`, inside the async IIFE, change the `saveGameMatch({...})` call to include `difficulty` in the data object and pass the multiplier as the second argument. Add `difficulty: room.difficulty,` after `questions_count: room.questions.length,` in the data object, then change the call close from `});` to:

```typescript
                questions_count: room.questions.length,
                difficulty: room.difficulty,
            }, multiplierForDifficulty(room.difficulty));
```

- [ ] **Step 6: Apply the multiplier on disconnect**

In `handleDisconnect`, in the `matchRecord` object add `difficulty: room.difficulty,` after `questions_count: room.questions.length,`. Then update the `saveDisconnectWin` call and the `OPPONENT_DISCONNECTED` payload to use the multiplier:

```typescript
                const mult = multiplierForDifficulty(room.difficulty);
                const saveRanking = saveDisconnectWin(opponent.userId, opponent.displayName, mult).catch((err) =>
                    console.error("[GameShow WS] saveDisconnectWin error:", err)
                );
                await Promise.all([saveMatch, saveRanking]);
            })();
            sendToPlayer(opponent, {
                type: "OPPONENT_DISCONNECTED",
                message: "Đối thủ đã ngắt kết nối. Bạn thắng mặc định!",
                rankingDelta: Math.round(5 * mult),
            });
```

Note: `mult` is declared inside the async IIFE but used in the `sendToPlayer` below it. Move the `const mult = multiplierForDifficulty(room.difficulty);` line to just **above** the `(async () => {` block so both the IIFE and the `OPPONENT_DISCONNECTED` send can read it.

- [ ] **Step 7: Read difficulty from JOIN_QUEUE**

In the `JOIN_QUEUE` case, where `currentPlayer` is constructed, replace `mode: msg.mode,` with:

```typescript
                        difficulty: msg.difficulty,
```

- [ ] **Step 8: Typecheck the server file**

Run: `npx tsc --noEmit`
Expected: no errors in `server/gameshow-ws.ts` (errors may remain in `supabase-server.ts` until Task 5 and in client files until Tasks 7–10).

- [ ] **Step 9: Commit**

```bash
git add server/gameshow-ws.ts
git commit -m "feat(gameshow-ws): difficulty matchmaking + point multiplier wiring"
```

---

## Task 5: Supabase layer — persist difficulty, apply multiplier, history

**Files:**
- Modify: `server/supabase-server.ts`

- [ ] **Step 1: Add the multiplier helper import**

At the top of `server/supabase-server.ts`, change:

```typescript
import { POINTS_WIN, computeRankingDeltas, outcomeDelta } from "./ranking";
```

to:

```typescript
import { POINTS_WIN, computeRankingDeltas, outcomeDelta } from "./ranking";
import { multiplierForDifficulty } from "../shared/constants";
```

- [ ] **Step 2: Add `difficulty` to `GameMatchData` and the insert**

In the `GameMatchData` type, add after `questions_count: number;`:

```typescript
    difficulty: number;
```

In `insertGameMatch`, add to the `.insert({...})` object after `questions_count: data.questions_count,`:

```typescript
        difficulty: data.difficulty,
```

- [ ] **Step 3: Apply the multiplier in `saveGameMatch`**

Change the signature and the `computeRankingDeltas` call:

```typescript
export async function saveGameMatch(data: GameMatchData, multiplier = 1): Promise<{ player1Delta: number; player2Delta: number }> {
    // 1. Save match record
    await insertGameMatch(data);

    // 2. Determine point deltas (pure math in ./ranking), scaled by difficulty
    const { player1Delta: p1Delta, player2Delta: p2Delta } =
        computeRankingDeltas(data.winner_id, data.player1_id, data.player2_id, multiplier);
```

(Leave the rest of `saveGameMatch` unchanged.)

- [ ] **Step 4: Apply the multiplier in `saveDisconnectWin`**

Replace `saveDisconnectWin` with:

```typescript
export async function saveDisconnectWin(
    winnerId: string,
    winnerDisplayName: string,
    multiplier = 1,
): Promise<number> {
    const delta = Math.round(POINTS_WIN * multiplier);
    await applyRankingDelta(winnerId, delta, winnerDisplayName);
    return delta;
}
```

- [ ] **Step 5: Select + map difficulty in `getMatchHistory`**

In `getMatchHistory`, add `difficulty` to the `.select(...)` column list (append `,difficulty` inside the string). Then in the `.map(...)` callback, replace the `const rankingDelta = outcomeDelta(outcome);` line and add the field to the returned object:

```typescript
        const difficulty = m.difficulty ?? 1;
        // Điểm xếp hạng tính theo hệ số của độ khó trận đó (đồng bộ với lúc kết thúc trận)
        const rankingDelta = outcomeDelta(outcome, multiplierForDifficulty(difficulty));
```

and add `difficulty,` to the returned object literal (after `questionsCount: m.questions_count ?? 10,`):

```typescript
            questionsCount: m.questions_count ?? 10,
            difficulty,
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `server/supabase-server.ts` (client errors remain until Tasks 7–10).

- [ ] **Step 7: Commit**

```bash
git add server/supabase-server.ts
git commit -m "feat(supabase): persist match difficulty + multiplied ranking deltas"
```

---

## Task 6: DB migration for the difficulty column

**Files:**
- Create: `server/migrations/008_game_matches_difficulty.sql`

- [ ] **Step 1: Write the migration**

Create `server/migrations/008_game_matches_difficulty.sql` with:

```sql
-- ================================================================
-- Migration 008: Match difficulty
-- Run in Supabase SQL Editor AFTER migration 007
--
-- Records which difficulty (1=easy/2=medium/3=hard) a match was played
-- at. Drives the ranking-point multiplier (×1 / ×1.5 / ×2) and is shown
-- in match history. Existing rows default to 1 (easy).
-- ================================================================

ALTER TABLE public.game_matches
  ADD COLUMN IF NOT EXISTS difficulty integer NOT NULL DEFAULT 1;
```

- [ ] **Step 2: Commit**

```bash
git add server/migrations/008_game_matches_difficulty.sql
git commit -m "feat(db): add difficulty column to game_matches (migration 008)"
```

- [ ] **Step 3: Manual apply note**

After this branch is deployed, run migration 008 in the Supabase SQL Editor (it is idempotent via `IF NOT EXISTS`). The server already defaults missing difficulty to 1, so the app keeps working before the column exists; the column is required for new writes to persist difficulty.

---

## Task 7: WS integration tests — difficulty matching + multiplied deltas

**Files:**
- Modify: `server/__tests__/gameshow-ws.integration.test.ts`

- [ ] **Step 1: Update the `saveGameMatch` mock to honor the multiplier**

In the `jest.mock('../supabase-server', ...)` factory, replace the `saveGameMatch` mock with one that reads the multiplier arg:

```typescript
    saveGameMatch: jest.fn(async (data: any, multiplier = 1) =>
      computeRankingDeltas(data.winner_id, data.player1_id, data.player2_id, multiplier),
    ),
```

Also update `saveDisconnectWin` so its return matches the real signature (it is fire-and-forget in the server, value unused, but keep it faithful):

```typescript
    saveDisconnectWin: jest.fn(async (_id: string, _name: string, multiplier = 1) => Math.round(5 * multiplier)),
```

- [ ] **Step 2: Switch the test harness from `mode` to `difficulty`**

Replace the `join` helper and `pair` helper signatures:

```typescript
const join = (c: Client, difficulty?: number) =>
  c.send({
    type: 'JOIN_QUEUE',
    userId: c.userId,
    token: `valid:${c.userId}`,
    displayName: c.userId,
    difficulty,
  });

/** Pair two fresh clients and return them once both are in a room. */
async function pair(idA: string, idB: string, difficulty?: number) {
  const a = makeClient(idA);
  const b = makeClient(idB);
  await Promise.all([a.opened, b.opened]);
  join(a, difficulty);
  join(b, difficulty);
  const [ma, mb] = await Promise.all([
    a.waitType('MATCH_FOUND'),
    b.waitType('MATCH_FOUND'),
  ]);
  return { a, b, ma, mb };
}
```

- [ ] **Step 3: Update the existing matchmaking test call**

In the first matchmaking test, change:

```typescript
    const { a, b, ma, mb } = await pair('mm-a', 'mm-b', 'add_sub');
```

to:

```typescript
    const { a, b, ma, mb } = await pair('mm-a', 'mm-b', 1);
```

- [ ] **Step 4: Add a difficulty-3 multiplied-delta test**

Add this test inside the `describe('full match flow', ...)` block (after the existing decisive-match test):

```typescript
  it('applies the difficulty multiplier to ranking deltas (D3 → +10 / -6)', async () => {
    const { a, b, ma } = await pair('d3-a', 'd3-b', 3);
    const questions: any[] = ma.questions;
    const roomId: string = ma.roomId;
    expect(ma.difficulty).toBe(3);

    for (let i = 0; i < questions.length; i++) {
      a.send({ type: 'SUBMIT_ANSWER', userId: a.userId, roomId, questionIndex: i, answer: questions[i].correctAnswer, timeMs: 1000 });
    }
    await a.waitType('YOU_FINISHED');
    for (let i = 0; i < questions.length; i++) {
      b.send({ type: 'SUBMIT_ANSWER', userId: b.userId, roomId, questionIndex: i, answer: `${questions[i].correctAnswer}_wrong`, timeMs: 2000 });
    }

    const over = await a.waitType('GAME_OVER');
    expect(over.winnerId).toBe('d3-a');
    expect(over.results['d3-a'].rankingDelta).toBe(10);
    expect(over.results['d3-b'].rankingDelta).toBe(-6);

    a.close();
    b.close();
  });
```

- [ ] **Step 5: Run the full server suite**

Run: `npx jest server/__tests__`
Expected: PASS — matchmaking, full-match (default D1 → +5/−3), D3 multiplier (+10/−6), emoji, chat, disconnect (still +5 at default D1), session locks.

- [ ] **Step 6: Commit**

```bash
git add server/__tests__/gameshow-ws.integration.test.ts
git commit -m "test(gameshow-ws): difficulty matchmaking + multiplied delta coverage"
```

---

## Task 8: Client hook — joinQueue(difficulty)

**Files:**
- Modify: `client/src/hooks/useGameShowWS.ts`

- [ ] **Step 1: Store match difficulty in state**

In `GameShowState`, add after `winnerId?: string | null;`:

```typescript
    difficulty: number;
```

In the initial `useState<GameShowState>({...})` object, add after `winnerId` is NOT present there — add `difficulty: 1,` near `roomId: null,`:

```typescript
        roomId: null,
        difficulty: 1,
```

In the `MATCH_FOUND` handler's `setState`, add `difficulty: msg.difficulty ?? 1,` (after `roomId: msg.roomId,`). In the `resetGame` state object, also add `difficulty: 1,` after `roomId: null,` to keep shapes consistent.

- [ ] **Step 2: Change `joinQueue` to send difficulty**

Replace the `joinQueue` callback:

```typescript
    const joinQueue = useCallback(async (difficulty?: number) => {
        if (!userId) return;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? "";
        if (!token) return; // refuse to join without a valid session
        const deviceId = await getDeviceId();
        connect();
        const tryJoin = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                send({ type: "JOIN_QUEUE", userId, token, deviceId, displayName, grade, winRate, totalScore, difficulty });
            } else {
                setTimeout(tryJoin, 200);
            }
        };
        tryJoin();
    }, [userId, displayName, grade, winRate, totalScore, connect, send]);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `useGameShowWS.ts` (callers in `GameShowScreen.tsx` updated next).

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useGameShowWS.ts
git commit -m "feat(useGameShowWS): joinQueue(difficulty) + match difficulty in state"
```

---

## Task 9: Lobby + Home + GameShow screen — difficulty cards

**Files:**
- Modify: `client/src/screens/GameShow/IdlePhase.tsx`
- Modify: `client/src/screens/GameShowScreen.tsx`
- Modify: `client/src/screens/HomeScreen.tsx`

- [ ] **Step 1: Rewrite `IdlePhase.tsx` to render difficulty cards**

Replace the contents of `client/src/screens/GameShow/IdlePhase.tsx` with:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { C } from '../../theme';
import { DIFFICULTIES } from '../../../../shared/constants';
import { s } from './styles';
import { ASSETS } from '../../assets';

interface Props {
  myRankingPoints: number | null;
  myAvatarUrl: string | null;
  error: string | null;
  userId: string | null;
  /** Tapping a difficulty card joins the queue at that difficulty right away. */
  onJoin: (difficulty: number) => void;
  onHistory: () => void;
}

// Per-difficulty card colors (UI-only concern, so kept here not in shared/).
const DIFF_COLORS: Record<number, { accent: string; tint: string; border: string }> = {
  1: { accent: '#2E9E45', tint: '#E9F7EA', border: '#BFE5C4' },
  2: { accent: '#E0A100', tint: '#FFF7E0', border: '#F1DC9A' },
  3: { accent: C.orange,  tint: '#FFF0E9', border: C.peachBorder },
};

// Battle Math lobby: history button on top, then one colored card per difficulty —
// title + range/multiplier description + me-vs-? row. Tapping queues immediately.
export default function IdlePhase({
  myRankingPoints, myAvatarUrl, error, userId, onJoin, onHistory,
}: Props) {
  return (
    <SafeAreaView style={s.bg}>
      {/* ── Header bar ── */}
      <View style={s.lobbyBar}>
        <View style={s.lobbyBarTop}>
          <Text style={s.lobbyTitle} numberOfLines={1}>{`${ASSETS.gameshow.pkTitle} Battle Math`}</Text>
          <TouchableOpacity style={s.historyPill} onPress={onHistory} activeOpacity={0.8}>
            <Text style={s.historyPillTxt}>{`${ASSETS.gameshow.history} Lịch sử`}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.lobbySub}>Chọn độ khó · Real-time 1v1</Text>
        {myRankingPoints != null && (
          <View style={s.lobbyPtsChip}>
            <Text style={s.lobbyPtsTxt}>
              {ASSETS.home.points} Điểm xếp hạng: {myRankingPoints.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.idleWrap} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={s.errBox}>
            <Text style={s.errTxt}>{error}</Text>
          </View>
        ) : null}

        {/* ── One tappable card per difficulty — tap = queue right away ── */}
        {DIFFICULTIES.map(d => {
          const dc = DIFF_COLORS[d.id] ?? DIFF_COLORS[1];
          return (
            <TouchableOpacity
              key={d.id}
              style={[s.lobbyCard, { backgroundColor: dc.tint, borderColor: dc.border }, !userId && { opacity: 0.55 }]}
              onPress={() => onJoin(d.id)}
              disabled={!userId}
              activeOpacity={0.8}
              accessibilityLabel={`Vào trận ${d.label}`}
            >
              <View style={s.lobbyCardHead}>
                <View style={s.lobbyCardIcon}>
                  <Text style={{ fontSize: 20 }}>{d.icon}</Text>
                </View>
                <Text style={s.lobbyCardTitle}>{d.label}</Text>
                <View style={[s.lobbyChip, { backgroundColor: dc.accent }]}>
                  <Text style={s.lobbyChipTxt}>{d.desc}</Text>
                </View>
              </View>

              <Text style={s.lobbyCardDetail}>{d.detail}</Text>

              <View style={s.lobbyPkRow}>
                <View style={s.lobbyPlayer}>
                  <View style={[s.lobbyAva, { borderColor: dc.accent }]}>
                    {myAvatarUrl ? (
                      <Image source={{ uri: myAvatarUrl }} style={s.lobbyAvaImg} />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{ASSETS.gameshow.youAvatar}</Text>
                    )}
                  </View>
                  <Text style={s.lobbyAvaLabel}>Tôi</Text>
                </View>
                <Text style={[s.lobbyPkTxt, { color: dc.accent }]}>VS</Text>
                <View style={s.lobbyPlayer}>
                  <View style={[s.lobbyAva, { borderColor: C.line }]}>
                    <Text style={{ fontSize: 22, color: C.inkSlate }}>?</Text>
                  </View>
                  <Text style={s.lobbyAvaLabel}>Đối thủ</Text>
                </View>
              </View>

              <Text style={[s.lobbyTapHint, { color: dc.accent }]}>
                Chạm để vào trận ngay {ASSETS.home.bolt}
              </Text>
            </TouchableOpacity>
          );
        })}

        {!userId && (
          <Text style={s.loginHint}>Vui lòng đăng nhập để chơi</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Update `GameShowScreen.tsx` state + route param + onJoin**

Replace the `selectedMode` state line (`const [selectedMode, setSelectedMode] = useState('add_sub');`) with:

```tsx
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);
```

Replace the mode pre-select effect:

```tsx
  // Mode pre-selected from HomeScreen's "Chế độ PK" cards (tab nav param).
  useEffect(() => {
    const m = route.params?.mode;
    if (m) setSelectedMode(m);
  }, [route.params?.mode]);
```

with:

```tsx
  // Difficulty pre-selected from HomeScreen's quick-cards (tab nav param).
  useEffect(() => {
    const d = route.params?.difficulty;
    if (d) setSelectedDifficulty(d);
  }, [route.params?.difficulty]);
```

Replace the `IdlePhase` `onJoin` prop:

```tsx
        onJoin={(mode) => { setSelectedMode(mode); joinQueue(mode); }}
```

with:

```tsx
        onJoin={(difficulty) => { setSelectedDifficulty(difficulty); joinQueue(difficulty); }}
```

- [ ] **Step 3: Update `HomeScreen.tsx` quick-cards**

Change the import `import { MODES } from '../../../shared/constants';` to:

```tsx
import { DIFFICULTIES } from '../../../shared/constants';
```

Replace the PK modes block (`<Text style={styles.h3}>Chế độ Battle Math</Text>` through the closing of the `MODES.map`) with:

```tsx
          <Text style={styles.h3}>Chọn độ khó</Text>
          <View style={styles.modeRow}>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity
                key={d.id}
                style={styles.modeCard}
                onPress={() => navigation.navigate('GameShowTab', { difficulty: d.id })}
                activeOpacity={0.85}
              >
                <View style={styles.modeIconWrap}>
                  <Text style={{ fontSize: 24 }}>{d.icon}</Text>
                </View>
                <Text style={styles.modeName}>{d.label}</Text>
                <Text style={styles.modeDesc}>{d.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in the three edited screens. (`GameResults.tsx`/`PlayingPhase.tsx` only mention "mode" in comments — no code change required; optionally tidy the comments.)

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/GameShow/IdlePhase.tsx client/src/screens/GameShowScreen.tsx client/src/screens/HomeScreen.tsx
git commit -m "feat(ui): difficulty picker in lobby + home quick-cards"
```

---

## Task 10: Match history — difficulty field + badge

**Files:**
- Modify: `client/src/services/api.ts`
- Modify: `client/src/screens/MatchHistoryScreen.tsx`

- [ ] **Step 1: Add `difficulty` to the DTO**

In `client/src/services/api.ts`, add to the `MatchHistoryItem` interface after `questionsCount: number;`:

```typescript
  difficulty: number;
```

(`getMatchHistory` already returns the raw JSON; no fetch change needed — the server now includes `difficulty`.)

- [ ] **Step 2: Show a difficulty badge in the history card**

In `client/src/screens/MatchHistoryScreen.tsx`, add the import after the existing `ASSETS` import:

```typescript
import { difficultyById } from '../../../shared/constants';
```

In `renderItem`, inside `s.cardMid`, add a difficulty label below the `s.meta` line:

```tsx
          <Text style={s.meta}>
            Đúng {item.myCorrect}/{item.questionsCount} · {fmtDate(item.playedAt)}
          </Text>
          <Text style={s.diffTag}>{difficultyById(item.difficulty).label}</Text>
```

Add the `diffTag` style to the `StyleSheet.create({...})` block (next to `meta`):

```typescript
  diffTag: { fontSize: 11, color: C.inkSlate, fontFamily: F.bodyMedium },
```

- [ ] **Step 3: Typecheck the full project**

Run: `npx tsc --noEmit`
Expected: **no errors anywhere** — `GameMode`/`MODES` are fully removed and every consumer now uses difficulty.

- [ ] **Step 4: Run the whole test suite**

Run: `npm test`
Expected: PASS (ranking, questions, gameshow-ws integration, rateLimiter, session-locks).

- [ ] **Step 5: Commit**

```bash
git add client/src/services/api.ts client/src/screens/MatchHistoryScreen.tsx
git commit -m "feat(history): show match difficulty + carry it in the DTO"
```

---

## Final verification

- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm test` — all suites green.
- [ ] Manual smoke (optional, needs server + Expo web): start server (`npm run server`) and `npm run web`; open the GameShow tab, confirm three difficulty cards (Độ khó 1/2/3) appear, tapping one queues, and a finished D3 match awards +10/−6.
- [ ] Apply migration `008_game_matches_difficulty.sql` in Supabase before relying on persisted difficulty in production.

## Notes for the implementer

- All `npx`/`npm` commands run from `D:\app_math\new-version-app`.
- TDD is used for the two pure-logic units (ranking, questions); plumbing/UI tasks are verified by `npx tsc --noEmit` plus the integration suite, which is the established pattern in this repo.
- `GameResults.tsx` multiplier badge is intentionally **out of scope** (spec marks it optional). The hook now carries `state.difficulty`, so it can be added later without server changes.
- Per-difficulty leaderboard is out of scope.
