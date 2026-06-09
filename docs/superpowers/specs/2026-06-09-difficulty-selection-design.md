# Difficulty Selection (Độ khó) — Design

**Date:** 2026-06-09
**Status:** Approved (pending spec review)

## Summary

Add a **difficulty** choice before matchmaking. Difficulty **replaces** the existing
play-mode picker (Cộng/Trừ, Nhân/Chia, Hỗn hợp). The lobby now shows three cards —
Độ khó 1 / 2 / 3 — and tapping one joins the queue at that difficulty.

Every difficulty uses **mixed operations (+ − × ÷)** plus a comparison question every
3rd slot (the current cadence is unchanged). Difficulty changes two things only: the
**operand range** and the **ranking-point multiplier**.

| Difficulty | Operand range | Point multiplier |
|------------|---------------|------------------|
| 1 (Dễ)     | 0–10          | ×1               |
| 2 (Vừa)    | 0–100         | ×1.5             |
| 3 (Khó)    | 0–1000        | ×2               |

## Decisions

- **Difficulty replaces mode.** The three mode cards are removed; all questions are
  mixed-operation. There is no separate mode axis anymore.
- **Answer cap (global, all difficulties):** every answer is a **positive integer
  (≥ 1) and < 2000**. Difficulty only changes the operand range, not this cap.
  - No zero or negative answers (no `a − a = 0`, no `× 0`).
  - For × and ÷, operands are chosen so the answer is a positive integer < 2000
    (so Độ khó 3 produces e.g. `4 × 487 = 1948`, never `999 × 999`).
- **Points:** base +5 win / −3 loss, multiplied by the difficulty coefficient and
  rounded half-up on magnitude (`Math.round`):
  - D1 (×1): **+5 / −3**
  - D2 (×1.5): **+8 / −5** (7.5→8, 4.5→5)
  - D3 (×2): **+10 / −6**
  - Disconnect win uses the same multiplier.
- **Matchmaking:** **strictly same difficulty** — a player is only ever paired with
  someone who chose the **same difficulty**. There is **no** cross-difficulty fallback;
  if nobody on the same difficulty is waiting, the player stays in queue until one
  appears. Both players therefore always share the same range and multiplier. (This
  removes the old ~12 s "match anyone" fallback.)

## Match history (in scope)

Match difficulty **is** persisted and shown in history.

- **DB migration** `server/migrations/008_game_matches_difficulty.sql`:
  `ALTER TABLE game_matches ADD COLUMN difficulty integer NOT NULL DEFAULT 1;`
  (Default `1` keeps existing rows valid.)
- `GameMatchData` + `insertGameMatch`: add `difficulty`. Both the normal-finish save
  (`saveGameMatch`) and the disconnect save (`saveMatchRecord`) write it from
  `room.difficulty`.
- `getMatchHistory`: select `difficulty`; map it into the item; recompute
  `rankingDelta` with the difficulty's multiplier
  (`outcomeDelta(outcome, multiplier(difficulty))`) so history shows the correct
  multiplied delta, not the base ±5/∓3.
- `MatchHistoryItem` DTO (`client/src/services/api.ts`): add `difficulty: number`.
- `MatchHistoryScreen.tsx`: render a small difficulty label/badge on each card
  (e.g. "Độ khó 2 · ×1.5").

## Out of scope (YAGNI)

- No per-difficulty leaderboard.
- No new results-screen animation for the multiplier (a small static badge is fine but
  optional).
- Backward compatible: a client that omits `difficulty` defaults to **1**
  (`normalizeDifficulty`).

## Architecture & change surface

### Shared (`shared/`)
- `types.ts`
  - Add `export type GameDifficulty = 1 | 2 | 3;`.
  - Remove the now-unused `GameMode` type.
  - `GameQuestion.difficulty` is set to the difficulty id (was always `1`).
- `constants.ts`
  - Replace `MODES` / `GameModeOption` with `DIFFICULTIES` / `DifficultyOption`.
    Each entry: `{ id: GameDifficulty; label; desc; detail; icon; max; multiplier }`.
  - Single source for both the lobby cards and the server's range/multiplier lookup.

### Server (`server/`)
- `questions.ts`
  - `normalizeDifficulty(d?): GameDifficulty` (default `1`).
  - `generateQuestions(count, difficulty)` derives the operand range from `max` and
    enforces the global rule: **answer is a positive integer, 1 ≤ answer < 2000**, for
    `+`, `−`, `×`, `÷`. Comparison questions use two numbers in `0..max`.
- `ranking.ts`
  - `outcomeDelta(outcome, multiplier = 1)` → `Math.round(POINTS_WIN * m)` /
    `-Math.round(POINTS_LOSE * m)` / `0`.
  - `computeRankingDeltas(winnerId, p1, p2, multiplier = 1)`.
- `gameshow-ws.ts`
  - `JOIN_QUEUE` message carries `difficulty?: number`.
  - `Player` gains `difficulty?`; `GameRoom` gains `difficulty: GameDifficulty`
    (multiplier looked up from it).
  - `createRoom`: `difficulty = normalizeDifficulty(p1.difficulty)`;
    `generateQuestions(QUESTIONS_PER_MATCH, difficulty)`.
  - `tryMatch` pairs **only** players with the same difficulty; the old Pass-2
    "match anyone" fallback (and `MATCH_FALLBACK_MS`) is **removed**.
  - `finishGame` and the disconnect path pass the room's multiplier through.
  - (Optional) include `difficulty`/`multiplier` in `MATCH_FOUND` for client display.
- `supabase-server.ts`
  - `GameMatchData` gains `difficulty`; `insertGameMatch` writes the `difficulty`
    column.
  - `saveGameMatch(data, multiplier = 1)` → `computeRankingDeltas(..., multiplier)`.
  - `saveDisconnectWin(winnerId, displayName, multiplier = 1)`.
  - `getMatchHistory`: select `difficulty`, return it, recompute `rankingDelta` with
    `outcomeDelta(outcome, multiplier(difficulty))`.
- `migrations/008_game_matches_difficulty.sql`: add the `difficulty` column.

### Client (`client/src/`)
- `hooks/useGameShowWS.ts`: `joinQueue(difficulty)` sends `difficulty` in `JOIN_QUEUE`.
- `screens/GameShow/IdlePhase.tsx`: render `DIFFICULTIES` cards (range + multiplier
  badge); `onJoin(difficulty)`.
- `screens/GameShowScreen.tsx`: `selectedDifficulty` state (default `1`) +
  `route.params.difficulty`; `onJoin` passes difficulty.
- `screens/HomeScreen.tsx`: the PK quick-cards switch to `DIFFICULTIES`, navigating with
  `{ difficulty }`.
- `components/GameResults.tsx`: optional small "×1.5 / ×2" badge (nice-to-have).
- `screens/MatchHistoryScreen.tsx`: small difficulty badge on each card.

## Tests

- `server/__tests__/questions.test.ts`: generation now takes a difficulty; assert
  operands within range, answer is a positive integer `1 ≤ answer < 2000`, and all four
  ops + comparison appear.
- `server/__tests__/ranking` (new or extended): multiplier rounding —
  D2 → +8/−5, D3 → +10/−6.
- `server/__tests__/gameshow-ws.integration.test.ts`: same-difficulty players pair;
  two different-difficulty players do **not** pair; D3 win awards the multiplied delta.
- Match-history mapping: `rankingDelta` reflects the stored difficulty's multiplier
  (e.g. a D2 win shows +8, not +5).

## Data flow

```
IdlePhase (tap Độ khó N)
  → GameShowScreen.onJoin(N)
  → useGameShowWS.joinQueue(N)
  → JOIN_QUEUE { difficulty: N }
  → tryMatch() pairs ONLY same-difficulty (no cross-difficulty fallback)
  → createRoom: generateQuestions(10, N), room.difficulty = N
  → MATCH_FOUND { questions }
  → play …
  → finishGame: saveGameMatch(data, multiplier(N)) → ranking delta ×N
  → GAME_OVER { rankingDelta }
```

## Error handling / edge cases

- **No cross-difficulty matches:** players are only ever paired with someone on the
  same difficulty. If nobody on that difficulty is waiting, the player simply stays in
  queue — never matched into a different difficulty. Both players in a room always share
  the same range and multiplier.
- **Untrusted difficulty:** `normalizeDifficulty` coerces any missing/invalid value to
  `1`, mirroring the existing `normalizeMode` guard.
