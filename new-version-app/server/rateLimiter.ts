// ═══════════════════════════════════════════════════════════
// CHAT / EMOJI — per-user rate limiting + profanity filter.
// Sliding-window limits keyed by userId; tunables in shared/constants.
// ═══════════════════════════════════════════════════════════

import {
    EMOJIS,
    EMOJI_MAX, EMOJI_WIN_MS,
    CHAT_MAX, CHAT_WIN_MS,
    VI_BANNED, EN_BANNED,
} from "../shared/constants";

const ALLOWED_EMOJIS = new Set<string>(EMOJIS);

/** True if the emoji is in the allowed match-chat set. */
export function isAllowedEmoji(emoji: string): boolean {
    return ALLOWED_EMOJIS.has(emoji);
}

interface ChatRateLimit {
    emojiTs: number[];
    chatTs: number[];
}
const chatRateLimits = new Map<string, ChatRateLimit>();

function getRateLimit(userId: string): ChatRateLimit {
    if (!chatRateLimits.has(userId)) chatRateLimits.set(userId, { emojiTs: [], chatTs: [] });
    return chatRateLimits.get(userId)!;
}

/** Records an emoji send; returns false if the user is over the limit. */
export function canSendEmoji(userId: string): boolean {
    const rl = getRateLimit(userId);
    const now = Date.now();
    rl.emojiTs = rl.emojiTs.filter(t => now - t < EMOJI_WIN_MS);
    if (rl.emojiTs.length >= EMOJI_MAX) return false;
    rl.emojiTs.push(now);
    return true;
}

/** Records a chat send; returns false if the user is over the limit. */
export function canSendChat(userId: string): boolean {
    const rl = getRateLimit(userId);
    const now = Date.now();
    rl.chatTs = rl.chatTs.filter(t => now - t < CHAT_WIN_MS);
    if (rl.chatTs.length >= CHAT_MAX) return false;
    rl.chatTs.push(now);
    return true;
}

/** Drop a user's rate-limit state (call on disconnect). */
export function clearRateLimit(userId: string): void {
    chatRateLimits.delete(userId);
}

// Vietnamese + English profanity — substring match for VI, word-boundary for EN.
export function hasProfanity(text: string): boolean {
    const norm = text.toLowerCase().replace(/1/g, "i").replace(/@/g, "a").replace(/0/g, "o");
    for (const w of VI_BANNED) if (norm.includes(w)) return true;
    for (const w of EN_BANNED) if (new RegExp(`\\b${w}\\b`).test(norm)) return true;
    return false;
}
