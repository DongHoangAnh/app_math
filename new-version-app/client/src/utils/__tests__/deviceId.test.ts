// In-memory AsyncStorage mock
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
  setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
}));

import { getDeviceId } from '../deviceId';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe('getDeviceId', () => {
  it('generates a UUID-shaped id on first call', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns the same id on subsequent calls (persisted)', async () => {
    const first = await getDeviceId();
    const second = await getDeviceId();
    expect(second).toBe(first);
  });
});
