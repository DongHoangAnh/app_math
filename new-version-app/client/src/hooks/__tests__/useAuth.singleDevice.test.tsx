import { enforceSingleDevice } from '../useAuth';
import { gameApi, ApiError } from '../../services/api';
import { supabase } from '../../services/supabase';

jest.mock('../../utils/deviceId', () => ({ getDeviceId: jest.fn(async () => 'dev-1') }));
jest.mock('../../services/api', () => ({
  gameApi: { acquireLock: jest.fn(), heartbeat: jest.fn(), releaseLock: jest.fn() },
  ApiError: class ApiError extends Error { status: number; constructor(mockStatus: number){ super(); this.status = mockStatus; } },
}));
jest.mock('../../services/supabase', () => ({
  supabase: { auth: { signOut: jest.fn(async () => ({ error: null })) } },
}));

// Stub RN / Expo modules pulled in by useAuth.tsx
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session', () => ({ makeRedirectUri: jest.fn(() => 'mathup://auth/callback') }));
jest.mock('../../../../shared/constants', () => ({ HEARTBEAT_INTERVAL_MS: 30000 }));
jest.mock('../../config', () => ({ TERMS_VERSION: '1' }));

beforeEach(() => jest.clearAllMocks());

describe('enforceSingleDevice', () => {
  it('resolves silently when the lock is granted', async () => {
    (gameApi.acquireLock as jest.Mock).mockResolvedValueOnce({ granted: true });
    await expect(enforceSingleDevice()).resolves.toBeUndefined();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('signs out and throws when the lock is denied', async () => {
    (gameApi.acquireLock as jest.Mock).mockResolvedValueOnce({ granted: false });
    await expect(enforceSingleDevice()).rejects.toThrow(/thiết bị khác/);
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('fail-open: a network error does NOT sign the user out', async () => {
    (gameApi.acquireLock as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await expect(enforceSingleDevice()).resolves.toBeUndefined();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
