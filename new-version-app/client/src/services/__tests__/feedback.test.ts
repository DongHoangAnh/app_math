import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), seekTo: jest.fn() })),
  setAudioModeAsync: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

// Import AFTER mocks so module-load preloading uses the mocked player.
import { feedback } from '../feedback';

const mkPlayer = createAudioPlayer as jest.Mock;
// Players are created at import in order: correct, wrong, win, lose
const correctPlayer = mkPlayer.mock.results[0].value;

describe('feedback gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    feedback.setPrefs({ soundEnabled: true, hapticsEnabled: true });
  });

  it('plays sound + haptic on correct when enabled', () => {
    feedback.playCorrect();
    expect(correctPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(correctPlayer.play).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('plays nothing when sound + haptics disabled', () => {
    feedback.setPrefs({ soundEnabled: false, hapticsEnabled: false });
    feedback.playCorrect();
    expect(correctPlayer.play).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('plays haptic only when sound off but haptics on', () => {
    feedback.setPrefs({ soundEnabled: false, hapticsEnabled: true });
    feedback.playWrong();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });
});
