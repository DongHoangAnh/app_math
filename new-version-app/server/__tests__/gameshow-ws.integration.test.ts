/**
 * Integration tests for the GameShow WebSocket server (server/gameshow-ws.ts).
 *
 * We boot the real WS server on an ephemeral port and drive it with two real
 * `ws` clients, exercising the live protocol end to end: matchmaking, answer
 * submission, win/lose scoring, emoji + chat moderation, and disconnect-win.
 *
 * The only thing mocked is `./supabase-server` (the DB/auth boundary) — every
 * piece of game logic under test is the genuine article. Ranking deltas are
 * computed with the real `./ranking` math so GAME_OVER payloads stay faithful.
 */
import { createServer, type Server } from 'http';
import WebSocket from 'ws';

jest.mock('../supabase-server', () => {
  const { computeRankingDeltas } = require('../ranking');
  return {
    // token format "valid:<userId>" authenticates as that user; anything else fails.
    verifyToken: jest.fn(async (token: string) =>
      typeof token === 'string' && token.startsWith('valid:')
        ? { id: token.slice('valid:'.length) }
        : null,
    ),
    saveGameMatch: jest.fn(async (data: any, multiplier = 1) =>
      computeRankingDeltas(data.winner_id, data.player1_id, data.player2_id, multiplier),
    ),
    saveMatchRecord: jest.fn(async () => undefined),
    saveDisconnectWin: jest.fn(async (_id: string, _name: string, multiplier = 1) => Math.round(5 * multiplier)),
    updateTasksAfterMatch: jest.fn(async () => undefined),
    getLockOwnerDeviceId: jest.fn(async () => null),
  };
});

import { setupGameShowWS } from '../gameshow-ws';
import { QUESTIONS_PER_MATCH, EMOJI_MAX, CHAT_MAX } from '../../shared/constants';
import * as dbMock from '../supabase-server';

let httpServer: Server;
let baseUrl: string;

beforeAll(async () => {
  httpServer = createServer();
  setupGameShowWS(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  baseUrl = `ws://127.0.0.1:${port}/ws/gameshow`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

// ── Tiny promise-based WS client harness ────────────────────────────────────
type Pred = (m: any) => boolean;

function makeClient(userId: string) {
  const ws = new WebSocket(baseUrl);
  const buf: any[] = [];
  const waiters: { pred: Pred; resolve: (m: any) => void }[] = [];

  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    buf.push(m);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(m)) {
        waiters[i].resolve(m);
        waiters.splice(i, 1);
      }
    }
  });

  return {
    ws,
    userId,
    opened: new Promise<void>((res, rej) => {
      ws.once('open', () => res());
      ws.once('error', rej);
    }),
    send: (o: object) => ws.send(JSON.stringify(o)),
    waitFor(pred: Pred, ms = 5000): Promise<any> {
      const hit = buf.find(pred);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve, reject) => {
        const w = { pred, resolve };
        waiters.push(w);
        setTimeout(() => {
          const i = waiters.indexOf(w);
          if (i >= 0) {
            waiters.splice(i, 1);
            reject(new Error('timeout waiting for message'));
          }
        }, ms);
      });
    },
    waitType: function (type: string, ms = 5000) {
      return this.waitFor((m) => m.type === type, ms);
    },
    waitClose(ms = 5000): Promise<number> {
      return new Promise((resolve, reject) => {
        ws.once('close', (code) => resolve(code));
        setTimeout(() => reject(new Error('timeout waiting for close')), ms);
      });
    },
    close: () => ws.close(),
    buf,
  };
}

type Client = ReturnType<typeof makeClient>;

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

// ─────────────────────────────────────────────────────────────────────────────

describe('matchmaking', () => {
  it('pairs two queued players into the same room with a full question set', async () => {
    const { a, b, ma, mb } = await pair('mm-a', 'mm-b', 1);

    expect(ma.type).toBe('MATCH_FOUND');
    expect(ma.roomId).toBe(mb.roomId);
    expect(ma.questions).toHaveLength(QUESTIONS_PER_MATCH);
    // Both clients see the identical question set.
    expect(ma.questions.map((q: any) => q.id)).toEqual(mb.questions.map((q: any) => q.id));
    // Opponent info is cross-wired.
    expect(ma.opponent.userId).toBe('mm-b');
    expect(mb.opponent.userId).toBe('mm-a');

    a.close();
    b.close();
  });

  it('never pairs players on different difficulties', async () => {
    const a = makeClient('xdiff-a');
    const b = makeClient('xdiff-b');
    await Promise.all([a.opened, b.opened]);
    join(a, 1); // easy
    join(b, 3); // hard
    // Neither should get a MATCH_FOUND — they must not be paired across difficulties.
    await expect(a.waitType('MATCH_FOUND', 1500)).rejects.toThrow();
    expect(b.buf.some((m) => m.type === 'MATCH_FOUND')).toBe(false);

    // A same-difficulty partner for A joins → A matches with it, B stays waiting.
    const c = makeClient('xdiff-c');
    await c.opened;
    join(c, 1);
    const [ma, mc] = await Promise.all([a.waitType('MATCH_FOUND'), c.waitType('MATCH_FOUND')]);
    expect(ma.roomId).toBe(mc.roomId);
    expect(ma.difficulty).toBe(1);
    expect(b.buf.some((m) => m.type === 'MATCH_FOUND')).toBe(false);

    a.close(); b.close(); c.close();
  });

  it('rejects a JOIN_QUEUE with an invalid token (close code 4001)', async () => {
    const c = makeClient('bad-token-user');
    await c.opened;
    c.send({
      type: 'JOIN_QUEUE',
      userId: 'bad-token-user',
      token: 'not-valid',
      displayName: 'hacker',
    });
    const code = await c.waitClose();
    expect(code).toBe(4001);
  });
});

describe('full match flow', () => {
  it('plays a decisive match and reports the winner + ranking deltas', async () => {
    const { a, b, ma } = await pair('win-a', 'win-b');
    const questions: any[] = ma.questions;
    const roomId: string = ma.roomId;

    // Player A answers everything correctly; player B answers everything wrong.
    for (let i = 0; i < questions.length; i++) {
      a.send({ type: 'SUBMIT_ANSWER', userId: a.userId, roomId, questionIndex: i, answer: questions[i].correctAnswer, timeMs: 1000 });
    }
    // A should be told it finished and is waiting for the opponent.
    await a.waitType('YOU_FINISHED');
    // B should have observed A's progress.
    await b.waitType('OPPONENT_PROGRESS');

    for (let i = 0; i < questions.length; i++) {
      b.send({ type: 'SUBMIT_ANSWER', userId: b.userId, roomId, questionIndex: i, answer: `${questions[i].correctAnswer}_wrong`, timeMs: 2000 });
    }

    const [overA, overB] = await Promise.all([a.waitType('GAME_OVER'), b.waitType('GAME_OVER')]);

    expect(overA.winnerId).toBe('win-a');
    expect(overB.winnerId).toBe('win-a');

    const resA = overA.results['win-a'];
    const resB = overA.results['win-b'];
    expect(resA.correct).toBe(QUESTIONS_PER_MATCH);
    expect(resA.score).toBe(QUESTIONS_PER_MATCH * 100);
    expect(resB.correct).toBe(0);
    expect(resB.score).toBe(0);
    // Ranking deltas from the real ./ranking math: winner +5, loser -3.
    expect(resA.rankingDelta).toBe(5);
    expect(resB.rankingDelta).toBe(-3);

    a.close();
    b.close();
  });

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
});

describe('emoji moderation', () => {
  it('broadcasts allowed emojis, drops disallowed ones, and rate-limits spam', async () => {
    const { a, b, ma } = await pair('emo-a', 'emo-b');
    const roomId = ma.roomId;

    // Allowed emoji is broadcast to the opponent.
    a.send({ type: 'SEND_EMOJI', roomId, emoji: '🔥' });
    const recv = await b.waitType('EMOJI_RECEIVED');
    expect(recv.emoji).toBe('🔥');
    expect(recv.fromUserId).toBe('emo-a');

    // Disallowed emoji never arrives (assert by exhausting then timing out).
    a.send({ type: 'SEND_EMOJI', roomId, emoji: '🍕' });
    await expect(
      b.waitFor((m) => m.type === 'EMOJI_RECEIVED' && m.emoji === '🍕', 800),
    ).rejects.toThrow();

    // Rate limit: only EMOJI_MAX get through within the window.
    const before = b.buf.filter((m) => m.type === 'EMOJI_RECEIVED').length;
    for (let i = 0; i < EMOJI_MAX + 3; i++) a.send({ type: 'SEND_EMOJI', roomId, emoji: '👍' });
    // Give the server a beat to process the burst.
    await b.waitFor((m) => m.type === 'EMOJI_RECEIVED' && m.emoji === '👍').catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    const delivered = b.buf.filter((m) => m.type === 'EMOJI_RECEIVED').length - before;
    expect(delivered).toBeLessThanOrEqual(EMOJI_MAX);

    a.close();
    b.close();
  });
});

describe('chat moderation', () => {
  it('broadcasts clean chat, blocks profanity, and rate-limits', async () => {
    const { a, b, ma } = await pair('chat-a', 'chat-b');
    const roomId = ma.roomId;

    // Clean message reaches the opponent.
    a.send({ type: 'SEND_CHAT', roomId, text: 'good luck!' });
    const recv = await b.waitType('CHAT_RECEIVED');
    expect(recv.text).toBe('good luck!');
    expect(recv.fromUserId).toBe('chat-a');

    // Profanity is moderated back to the sender, not broadcast.
    a.send({ type: 'SEND_CHAT', roomId, text: 'what the fuck' });
    const mod = await a.waitType('CHAT_MODERATED');
    expect(mod.type).toBe('CHAT_MODERATED');

    // Rate limit kicks in after CHAT_MAX messages in the window.
    for (let i = 0; i < CHAT_MAX + 2; i++) a.send({ type: 'SEND_CHAT', roomId, text: `msg ${i}` });
    const limited = await a.waitType('CHAT_RATE_LIMITED');
    expect(limited.type).toBe('CHAT_RATE_LIMITED');

    a.close();
    b.close();
  });
});

describe('disconnect handling', () => {
  it('awards a disconnect win to the remaining player', async () => {
    const { a, b, ma } = await pair('dc-a', 'dc-b');
    expect(ma.roomId).toBeTruthy();

    // Player A drops; B should be told it won by default.
    a.close();
    const notice = await b.waitType('OPPONENT_DISCONNECTED');
    expect(notice.rankingDelta).toBe(5);
    expect(notice.message).toMatch(/thắng mặc định/);

    b.close();
  });
});

describe('single-device lock enforcement', () => {
  afterEach(() => {
    (dbMock.getLockOwnerDeviceId as jest.Mock).mockResolvedValue(null);
  });

  it('rejects JOIN_QUEUE when another device owns the lock (close code 4002)', async () => {
    (dbMock.getLockOwnerDeviceId as jest.Mock).mockResolvedValueOnce('other-device');

    const c = makeClient('user-lock-1');
    await c.opened;
    c.send({
      type: 'JOIN_QUEUE',
      userId: 'user-lock-1',
      token: 'valid:user-lock-1',
      displayName: 'A',
      deviceId: 'this-device',
    });
    const code = await c.waitClose();
    expect(code).toBe(4002);
  });

  it('allows JOIN_QUEUE when this device owns the lock', async () => {
    (dbMock.getLockOwnerDeviceId as jest.Mock).mockResolvedValueOnce('this-device');

    const c = makeClient('user-lock-2');
    await c.opened;
    c.send({
      type: 'JOIN_QUEUE',
      userId: 'user-lock-2',
      token: 'valid:user-lock-2',
      displayName: 'B',
      deviceId: 'this-device',
    });
    const msg = await c.waitType('QUEUED');
    expect(msg.type).toBe('QUEUED');
    c.close();
  });
});
