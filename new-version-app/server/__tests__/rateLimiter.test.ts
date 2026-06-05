import {
  isAllowedEmoji,
  canSendEmoji,
  canSendChat,
  clearRateLimit,
  hasProfanity,
} from '../rateLimiter';
import { EMOJIS, EMOJI_MAX, CHAT_MAX } from '../../shared/constants';

describe('rateLimiter — isAllowedEmoji', () => {
  it('accepts every emoji in the shared allow-list', () => {
    for (const e of EMOJIS) expect(isAllowedEmoji(e)).toBe(true);
  });

  it('rejects emojis outside the allow-list', () => {
    expect(isAllowedEmoji('🍕')).toBe(false);
    expect(isAllowedEmoji('💩')).toBe(false);
    expect(isAllowedEmoji('')).toBe(false);
  });
});

describe('rateLimiter — emoji rate limit', () => {
  it(`allows up to EMOJI_MAX (${EMOJI_MAX}) then blocks within the window`, () => {
    const user = 'emoji-user-1';
    clearRateLimit(user);
    for (let i = 0; i < EMOJI_MAX; i++) {
      expect(canSendEmoji(user)).toBe(true);
    }
    expect(canSendEmoji(user)).toBe(false);
    clearRateLimit(user);
  });

  it('limits are independent per user', () => {
    const a = 'emoji-user-a';
    const b = 'emoji-user-b';
    clearRateLimit(a);
    clearRateLimit(b);
    for (let i = 0; i < EMOJI_MAX; i++) canSendEmoji(a);
    expect(canSendEmoji(a)).toBe(false); // a is exhausted
    expect(canSendEmoji(b)).toBe(true); // b is fresh
    clearRateLimit(a);
    clearRateLimit(b);
  });

  it('clearRateLimit resets the counter', () => {
    const user = 'emoji-user-2';
    clearRateLimit(user);
    for (let i = 0; i < EMOJI_MAX; i++) canSendEmoji(user);
    expect(canSendEmoji(user)).toBe(false);
    clearRateLimit(user);
    expect(canSendEmoji(user)).toBe(true);
    clearRateLimit(user);
  });
});

describe('rateLimiter — chat rate limit', () => {
  it(`allows up to CHAT_MAX (${CHAT_MAX}) then blocks within the window`, () => {
    const user = 'chat-user-1';
    clearRateLimit(user);
    for (let i = 0; i < CHAT_MAX; i++) {
      expect(canSendChat(user)).toBe(true);
    }
    expect(canSendChat(user)).toBe(false);
    clearRateLimit(user);
  });

  it('emoji and chat budgets are tracked separately', () => {
    const user = 'chat-user-2';
    clearRateLimit(user);
    for (let i = 0; i < EMOJI_MAX; i++) canSendEmoji(user);
    expect(canSendEmoji(user)).toBe(false); // emoji exhausted
    expect(canSendChat(user)).toBe(true); // chat untouched
    clearRateLimit(user);
  });
});

describe('rateLimiter — hasProfanity', () => {
  it('flags Vietnamese banned words as substrings', () => {
    expect(hasProfanity('đụ')).toBe(true);
    expect(hasProfanity('thằng địt mẹ')).toBe(true);
  });

  it('flags English banned words on word boundaries', () => {
    expect(hasProfanity('what the fuck')).toBe(true);
    expect(hasProfanity('shit happens')).toBe(true);
  });

  it('catches simple leetspeak substitutions (1→i, 0→o, @→a)', () => {
    expect(hasProfanity('sh1t')).toBe(true);
  });

  it('does not flag clean text', () => {
    expect(hasProfanity('hello world')).toBe(false);
    expect(hasProfanity('good game well played')).toBe(false);
    expect(hasProfanity('1 + 1 = 2')).toBe(false);
  });

  it('does not flag English banned words embedded inside larger words', () => {
    // word-boundary match: "dick" inside "Dickens" should not trip.
    expect(hasProfanity('Charles Dickens')).toBe(false);
  });
});
