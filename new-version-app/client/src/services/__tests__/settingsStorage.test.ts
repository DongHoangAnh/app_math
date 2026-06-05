import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from '../settingsStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAS = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('settingsStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns defaults when nothing is stored', async () => {
    mockAS.getItem.mockResolvedValueOnce(null);
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored partial over defaults', async () => {
    mockAS.getItem.mockResolvedValueOnce(JSON.stringify({ soundEnabled: false }));
    await expect(loadSettings()).resolves.toEqual({ soundEnabled: false, hapticsEnabled: true });
  });

  it('returns defaults on malformed JSON (no throw)', async () => {
    mockAS.getItem.mockResolvedValueOnce('not json');
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('writes JSON under SETTINGS_KEY', async () => {
    await saveSettings({ soundEnabled: false, hapticsEnabled: false });
    expect(mockAS.setItem).toHaveBeenCalledWith(
      SETTINGS_KEY,
      JSON.stringify({ soundEnabled: false, hapticsEnabled: false }),
    );
  });
});
