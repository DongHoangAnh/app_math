# Practice Mode (Luyện tập đơn) — Design

**Date:** 2026-06-12
**Status:** Approved design — ready for implementation planning
**Author:** Brainstorm session (Norttis + Claude)

## 1. Overview

A **single-player practice mode** for mathup-mobile, positioned as a **learning
tool with progress tracking** — distinct from the ranked 1v1 PK game (Battle
Math). Players drill arithmetic and comparison questions solo, configure how a
session behaves, and review their progress over time.

**Explicitly unranked and EXP-free:** practice never touches ranking points, the
leaderboard, daily tasks, or EXP. Its purpose is skill-building and
self-tracking, not competition.

### Goals
- Let a learner practice math at their own pace with flexible session shapes.
- Track per-operation accuracy so weak spots surface and can be drilled.
- Reuse the existing question generator and PK play sub-components — no forks.

### Non-goals (v1 — deferred, conscious cuts)
- Trend-over-time charts / graphs.
- EXP, daily-task, or rank integration.
- Custom arbitrary number ranges, decimals, negative answers.
- A practice-specific leaderboard.
- Offline persistence / retry queue for failed saves.

## 2. Architecture backbone

Practice is **solo with no rank stakes**, so — unlike PK — it needs **no
WebSocket and no server-side question validation/anti-cheat**:

- **Questions are generated on the device** (client), pulled one at a time.
- **Results persist over REST** (`gameApi` → `authFetch` → `ApiError`,
  per Code Pattern #3) when a session ends — not in real time.
- The server stores what the client reports (unranked → no cheat incentive). If
  EXP/rank is ever added to practice, anti-cheat must be revisited.

### Shared generator move (Code Patterns #2 & #4)
- Relocate the pure generator logic from `server/questions.ts` to
  **`shared/questions.ts`** so the PK server *and* the practice client import one
  source of truth.
- `server/gameshow-ws.ts` updates its import path only — PK behavior unchanged.
- **Delete** the legacy `client/src/services/questionGenerator.ts` (the
  `eval`-based generator) after verifying no live imports remain.
- **Extend, don't fork:** add `generateQuestion(difficulty, { ops })` (single
  question, so ramp-up and endless work). Keep the existing
  `generateQuestions(count, difficulty)` as a thin wrapper (all ops) so PK is
  untouched.

## 3. Navigation & screens

Entry: a new **"Luyện tập"** section on `HomeScreen` with preset cards (mirrors
the existing PK difficulty cards). Practice screens register as **hidden tabs**
(`tabBarButton: () => null`, the same trick `StatsTab` / `MatchHistoryTab` use)
so they are full navigable screens but don't crowd the tab bar.

Follows the **glue-only folder pattern** (Code Pattern #5, like `screens/GameShow/`):

```
screens/
├── PracticeScreen.tsx          # glue only: owns config→play→summary routing + state/timers
└── Practice/
    ├── styles.ts               # shared StyleSheet
    ├── utils.ts                # pure helpers (scoring, accuracy, ramp reducer, format)
    ├── ConfigPhase.tsx         # preset cards + "Tùy chỉnh" advanced knobs
    ├── PlayPhase.tsx           # the question loop
    └── SummaryPhase.tsx        # end-of-session results
```

`PracticeStatsScreen.tsx` — a separate hidden-tab screen for practice history +
records + per-op accuracy, reached from Home's "Khám phá" grid and from a link on
the summary. Kept out of the PK-focused `StatisticsScreen`.

**Preset cards** (approach B — friendly cards over one engine):
**Cổ điển** · **Endless** · **Tốc độ** · **Ôn điểm yếu** · **Tùy chỉnh**.
The first four pre-fill `PracticeConfig`; "Tùy chỉnh" opens all knobs.

**Reuse, don't rebuild:** `GameKeypad`, `ComparisonButtons`, `QuestionDisplay`
from `screens/GameShow/` are used as-is for the play loop. If any carries a
PK-specific prop, lift it to a neutral shape rather than forking. No opponent,
chat, or emoji layer — those are PK-only.

## 4. Data model

New shared types (`shared/types.ts`):

```ts
export type PracticeOp = "add" | "sub" | "mul" | "div" | "compare";
export type SessionKind = "fixed" | "endless" | "timed";

export interface PracticeConfig {
  ops: PracticeOp[];          // operation filter (which ops may appear)
  difficulty: GameDifficulty; // starting / fixed difficulty (1|2|3)
  ramp: {                     // "độ khó tăng dần"
    enabled: boolean;
    upStreak: number;         // consecutive-correct to level up   (default 10)
    downStreak: number;       // consecutive-wrong to level down   (default 3)
  };
  session: { kind: SessionKind; count?: number; seconds?: number };
  timer: { enabled: boolean; perQuestionSeconds?: number };  // on/off + speed
  weakSpot?: boolean;         // seed ops from the player's weak data
}

export interface PracticeResult {
  config: PracticeConfig;
  total: number; correct: number;
  totalTimeMs: number;
  perOp: Record<PracticeOp, { attempted: number; correct: number }>;
  endedReason: "completed" | "quit" | "timeup";
}
```

`perOp` does double duty: the summary's per-operation accuracy table **and** the
raw material the server aggregates for weak-spot.

## 5. Play loop mechanics

`PracticeScreen` is glue (state + routing); `PlayPhase` renders. Phases:
`config → playing → summary`. No network mid-session.

**Per-question flow:**
1. Pull one question via `generateQuestion(currentDifficulty, { ops })`.
2. Render with `QuestionDisplay` + (`GameKeypad` for arithmetic /
   `ComparisonButtons` for compare).
3. If `timer.enabled`: per-question countdown from `perQuestionSeconds`; timeout
   = wrong + auto-advance. If disabled: no clock.
4. Record into `perOp` + `totalTimeMs`; update ramp streak counters.
5. Next question, or end.

**Timer speed presets** ("tốc độ hết thời gian"): Chậm 15s · Vừa 10s · Nhanh 5s
(10s matches PK's `QUESTION_SECONDS`).

**End conditions per session kind:**
- **fixed** — stop after `count` questions (presets 10 / 20 / 30).
- **endless** — until quit; optional "3 sai là dừng" survival toggle (off by
  default). Tracks best streak for records.
- **timed** — one global countdown (`seconds`, presets 60 / 120); answer as many
  as possible; timeup ends it.

**Ramp-up rule (applies only when `ramp.enabled`):**
- **+1 difficulty** after `upStreak` consecutive correct (default 10) → level up,
  reset correct counter. Capped at difficulty 3.
- **−1 difficulty** after `downStreak` consecutive wrong (default 3) → level
  down, reset wrong counter. Floored at difficulty 1.
- A correct answer resets the wrong counter; a wrong answer resets the correct
  counter.
- Implemented as a **pure reducer** in `Practice/utils.ts` (unit-testable).

**Feedback:** instant right/wrong tint per answer, reusing PK's answer-feedback
styling so visuals don't drift.

**Quit:** back/X during play → confirm dialog → ends as `endedReason: "quit"`;
partial result still saved (weak-spot data preserved). A session with 0 attempts
is discarded, not saved.

**SFX:** reuse `ASSETS.sfx.*` correct/wrong if present; respect the sound setting
from `useSettings`.

## 6. Difficulty-change feedback & ramp config

**During play (when ramp triggers):**
- **Level up** — brief celebratory overlay: up indicator + difficulty icon (reuse
  `DIFFICULTIES[].icon`: 🟢→🟡→🔴), e.g. "Lên Độ khó 2 🟡⬆️" with a quick
  scale/glow + level-up SFX (if present). May reuse `FloatingEmojiLayer`'s pop
  style.
- **Level down** — gentler down indicator cue: "Về Độ khó 1 🟢⬇️", muted color,
  soft/no sound (encouraging, not punishing).
- **Persistent difficulty pill** in the play header (icon + label), always
  visible, animates on change.

**Showing the ramp conditions:**
- On the config screen (ramp on): a one-line rule chip — e.g. "Đúng 10 câu liên
  tiếp → lên cấp · Sai 3 câu liên tiếp → xuống cấp".
- During play: a small live hint, e.g. "Đúng 7/10 để lên cấp".

**Assets / icons (Code Pattern #6):** all practice-screen emoji icons and any new
sound files go **only** through the `ASSETS` registry under a per-screen key
(`ASSETS.practice.*`, `ASSETS.sfx.*`) — never inline emoji literals or
`require()` at the use site. Covers: preset-card icons, the level-up/level-down
indicator emoji (⬆️/⬇️), and ramp SFX. Keep the header screen→asset map in sync
when adding keys; SFX files live under `assets/sfx/` and **must be committed**.
Two carve-outs (already-correct sources, per the pattern's own exceptions): the
difficulty color icons reuse the existing single source `DIFFICULTIES[].icon`
(`shared/constants.ts`) rather than being copied into `ASSETS`; bare functional
arrows/glyphs (`→`, `✓`) stay inline.

**Threshold editability (both-by-preset):**
- **Cổ điển / Endless** presets → thresholds locked at 10 / 3 (shown, not
  editable).
- **Tùy chỉnh** preset → thresholds editable with validation:
  `upStreak` 5–20, `downStreak` 2–5. Defaults 10 / 3.

## 7. Server, API & DB

**New REST endpoints** (`server/index.ts` routes → `server/supabase-server.ts`
DB functions; auth required):
- `POST /api/practice/sessions` — body = `PracticeResult`. Inserts a session row
  and upserts the per-op aggregate.
- `GET  /api/practice/sessions/:userId` — recent session history (paged).
- `GET  /api/practice/summary/:userId` — per-op accuracy aggregate + personal
  records (best endless streak, best timed score). Feeds the stats screen and
  weak-spot seeding.

**`gameApi` additions** (`client/src/services/api.ts`, typed DTOs, on
`authFetch`, throwing `ApiError`):
`savePracticeSession(result)`, `getPracticeSessions(userId)`,
`getPracticeSummary(userId)`.

**DB schema** (`shared/schema.ts`, Drizzle) — two tables:
- `practice_sessions` — one row per finished session:
  `id, user_id, kind, difficulty_start, ramp_enabled, ops (jsonb), total,
  correct, total_time_ms, ended_reason, created_at`.
- `practice_op_stats` — rolling aggregate per user×op:
  `user_id, op, attempted, correct` (upsert on save). Weak-spot reads this —
  cheap, no history scan.

**Weak-spot seeding:** "Ôn điểm yếu" calls `getPracticeSummary`, picks the 1–2
ops with lowest `correct/attempted` ratio (require a minimum sample, e.g. ≥10
attempts per op; otherwise fall back to all ops with a gentle "chưa đủ dữ liệu"
note) and seeds `config.ops`.

## 8. Progress tracking surfaced (the "học tập" payoff)

- **End-of-session summary** (`SummaryPhase`): correct/wrong, accuracy %, average
  time per question, final difficulty reached (if ramp on).
- **Per-operation accuracy** table (+ − × ÷ compare → % correct) — on summary and
  on `PracticeStatsScreen`.
- **Session history + personal records** on `PracticeStatsScreen`: list of past
  sessions (date, kind, score) and bests (endless streak, timed score).
- *(Deferred: trend-over-time chart.)*

## 9. Testing

**Unit (Jest, pure logic — highest value):**
- `shared/questions.ts`: `generateQuestion` honors the `ops` filter (only
  requested ops appear); answers are positive integers `< ANSWER_MAX`; options
  always include the correct answer; comparison yields one of `< = >`.
- Ramp reducer (`Practice/utils.ts`): `upStreak` correct climbs (cap 3),
  `downStreak` wrong drops (floor 1), opposite answer resets the other counter.
- Weak-spot pick: lowest-accuracy op chosen; min-sample fallback to all ops.

**E2E (Playwright, web build):** one `practice.spec.ts` (per-screen rule) —
start a fixed 10-question session from a preset card, answer through, reach the
summary. Anchor selectors to Vietnamese copy per `e2e/README.md`.

## 10. Decisions log (from brainstorm)

- Purpose: **learning tool with progress tracking** (not pure offline, not
  EXP/rank).
- Session shape: **all three kinds** (fixed / endless / timed).
- v1 customization: **operation filter, timer on/off + speed, ramp-up,
  weak-spot review** (all four).
- Progress shown: **end-of-session summary, per-op accuracy, history + records**
  (trend chart deferred).
- Mode packaging: **B — preset cards over one configurable engine**.
- Ramp rule: **+1 after 10 consecutive correct, −1 after 3 consecutive wrong.**
- Ramp thresholds: **both-by-preset** — fixed/shown for Cổ điển & Endless,
  editable in Tùy chỉnh.
- Icons/SFX: managed via the **`ASSETS` registry** (Code Pattern #6); difficulty
  color icons reuse the existing `DIFFICULTIES[].icon` source.
