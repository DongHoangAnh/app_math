// ═══════════════════════════════════════════════════════════
// SHARED CONFIG — single source for game tunables and lists.
// Centralized so client UI and server logic stay in sync.
// ═══════════════════════════════════════════════════════════

import type { GameMode } from "./types";

// ─── Match shape ────────────────────────────────────────────
export const QUESTIONS_PER_MATCH = 10;
// Seconds shown on the per-question countdown (client UI).
export const QUESTION_SECONDS = 10;
// Keep at most this many chat/emoji bubbles in client state.
export const CHAT_HISTORY_MAX = 50;

// ─── Play modes (client picker + server question gen) ───────
export interface GameModeOption {
    id: GameMode;
    label: string;
    desc: string;    // one-word difficulty chip
    detail: string;  // short one-line description (PK lobby cards)
    icon: string;
}
export const MODES: GameModeOption[] = [
    { id: "add_sub", label: "Cộng/Trừ", desc: "Dễ",  detail: "Cộng, trừ trong phạm vi 10 · kèm câu so sánh", icon: "➕" },
    { id: "mul_div", label: "Nhân/Chia", desc: "Khó", detail: "Nhân, chia trong bảng cửu chương · kèm câu so sánh", icon: "✖️" },
    { id: "mixed",   label: "Hỗn hợp",  desc: "Thử", detail: "Đủ cả 4 phép tính + − × ÷ · thử thách toàn diện", icon: "🔀" },
];

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
