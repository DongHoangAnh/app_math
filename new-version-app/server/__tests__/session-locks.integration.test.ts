/**
 * Integration tests for the single-device session-lock REST routes.
 * Boots the real http server; mocks the supabase-server boundary.
 */
import { createServer, type Server } from 'http';

jest.mock('../supabase-server', () => ({
  verifyToken: jest.fn(async (t: string) =>
    typeof t === 'string' && t.startsWith('valid:') ? { id: t.slice(6) } : null,
  ),
  acquireSessionLock: jest.fn(async () => true),
  heartbeatSessionLock: jest.fn(async () => true),
  releaseSessionLock: jest.fn(async () => undefined),
  // unused by these routes but imported by index.ts:
  testSupabaseConnection: jest.fn(),
  getPlayerStats: jest.fn(), getPublicProfile: jest.fn(),
  getMatchHistory: jest.fn(), getDailyTasks: jest.fn(), claimTaskExp: jest.fn(),
  getLockOwnerDeviceId: jest.fn(),
}));

import * as db from '../supabase-server';
import { createApp } from '../index';

let server: Server;
let base: string;
const USER = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  server = createServer(createApp());
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const a = server.address();
  base = `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`;
});
afterAll(async () => { await new Promise<void>((r) => server.close(() => r())); });

async function post(path: string, body: object, token?: string) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('POST /api/session/acquire', () => {
  it('401 without a valid token', async () => {
    const r = await post('/api/session/acquire', { deviceId: 'd1' });
    expect(r.status).toBe(401);
  });

  it('400 when deviceId missing', async () => {
    const r = await post('/api/session/acquire', {}, `valid:${USER}`);
    expect(r.status).toBe(400);
  });

  it('grants and passes the token-derived userId (not the body)', async () => {
    const r = await post('/api/session/acquire', { deviceId: 'd1' }, `valid:${USER}`);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ granted: true });
    expect(db.acquireSessionLock).toHaveBeenCalledWith(USER, 'd1', 120);
  });

  it('returns granted:false when the lock is held elsewhere', async () => {
    (db.acquireSessionLock as jest.Mock).mockResolvedValueOnce(false);
    const r = await post('/api/session/acquire', { deviceId: 'd1' }, `valid:${USER}`);
    expect(r.json).toEqual({ granted: false });
  });
});

describe('POST /api/session/heartbeat', () => {
  it('returns owner flag from the lock', async () => {
    (db.heartbeatSessionLock as jest.Mock).mockResolvedValueOnce(false);
    const r = await post('/api/session/heartbeat', { deviceId: 'd1' }, `valid:${USER}`);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ owner: false });
  });
});

describe('POST /api/session/release', () => {
  it('200 ok', async () => {
    const r = await post('/api/session/release', { deviceId: 'd1' }, `valid:${USER}`);
    expect(r.status).toBe(200);
    expect(db.releaseSessionLock).toHaveBeenCalledWith(USER, 'd1');
  });
});
