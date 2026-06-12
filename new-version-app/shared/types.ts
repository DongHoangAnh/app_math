// ═══════════════════════════════════════════════════════════
// SHARED GAME TYPES — single source of truth for client + server.
// Wire protocol shapes live here so the two sides never drift.
// Client: imported by hooks/screens via Metro. Server: via tsx.
// ═══════════════════════════════════════════════════════════

export type QuestionType = "arithmetic" | "comparison";

// Difficulty chosen at queue time. Decides the operand range and the ranking
// point multiplier. All difficulties use mixed operations (+ − × ÷).
export type GameDifficulty = 1 | 2 | 3;

export interface GameQuestion {
    id: string;
    level: number;
    question: string;
    options: string[];
    correctAnswer: string;
    difficulty: number;
    // Optional on the wire: older servers may omit it; the client
    // falls back to inspecting correctAnswer to detect comparison.
    type?: QuestionType;
}

// One answer the player submitted for a single question.
export interface AnswerRecord {
    answer: string;
    isCorrect: boolean;
    timeMs: number;
}

export interface OpponentInfo {
    userId: string;
    displayName: string;
    grade?: string;
    winRate?: number;
    totalScore?: number;
}

export interface GameResult {
    correct: number;
    score: number;
    totalTimeMs: number;
    displayName: string;
    rankingDelta?: number;
}

export interface ChatMessage {
    id: string;
    fromUserId: string;
    fromName: string;
    text?: string;
    emoji?: string;
    type: "chat" | "emoji";
    timestamp: number;
}

export type MatchPhase =
    | "idle"
    | "queued"
    | "match_found"   // brief "found" screen
    | "playing"       // answering questions (independent per player)
    | "you_finished"  // I'm done, waiting for opponent
    | "game_over"
    | "opponent_disconnected";

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
