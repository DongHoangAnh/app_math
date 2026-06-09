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
