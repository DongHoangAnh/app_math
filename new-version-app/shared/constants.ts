// ═══════════════════════════════════════════════════════════
// SHARED CONFIG — single source for game tunables and lists.
// Centralized so client UI and server logic stay in sync.
// ═══════════════════════════════════════════════════════════

import type { GameDifficulty } from "./types";

// ─── Match shape ────────────────────────────────────────────
export const QUESTIONS_PER_MATCH = 10;
// Seconds shown on the per-question countdown (client UI).
export const QUESTION_SECONDS = 10;
// Keep at most this many chat/emoji bubbles in client state.
export const CHAT_HISTORY_MAX = 50;

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

// ─── Chat / emoji ───────────────────────────────────────────
// The only emojis allowed in match chat. Client renders this list;
// server validates incoming emoji against it.
export const EMOJIS = ["🔥", "😎", "👍", "😅", "💀", "🎉"] as const;

// Rate limits (server-enforced).
export const EMOJI_MAX = 3;
export const EMOJI_WIN_MS = 5_000;
export const CHAT_MAX = 5;
export const CHAT_WIN_MS = 30_000;
export const CHAT_MAX_LEN = 120;

// ─── Single-device login ────────────────────────────────────
// One account = one active device. The lock row is kept warm by a client
// heartbeat; if no heartbeat arrives within LOCK_TTL_SECONDS the lock is
// considered stale and another device may claim it. Used by both the client
// (interval) and the server (RPC ttl arg) — single source of truth.
export const LOCK_TTL_SECONDS = 120;
export const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Profanity filter ───────────────────────────────────────
// Vietnamese: substring match. English: word-boundary match.
export const VI_BANNED = [
    "đụ", "địt", "lồn", "cặc", "buồi", "chịch", "đéo", "đĩ",
    "điếm", "đmm", "clm", "đml", "đcm", "đkm",
];
export const EN_BANNED = [
    "fuck", "shit", "bitch", "bastard", "cunt", "dick", "cock",
    "pussy", "whore", "slut", "nigga", "nigger",
];
