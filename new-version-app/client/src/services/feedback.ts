import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { Settings } from './settingsStorage';
import { DEFAULT_SETTINGS } from './settingsStorage';

// Module-level prefs, kept in sync by useSettings via setPrefs().
let prefs: Settings = { ...DEFAULT_SETTINGS };

// Preload players once at import. Wrapped so a missing/broken asset never crashes.
function makePlayer(src: number): AudioPlayer | null {
  try {
    return createAudioPlayer(src);
  } catch (e) {
    console.warn('[feedback] failed to load sound', e);
    return null;
  }
}

const players = {
  correct: makePlayer(require('../../../assets/sfx/correct.mp3')),
  wrong:   makePlayer(require('../../../assets/sfx/wrong.mp3')),
  win:     makePlayer(require('../../../assets/sfx/win.mp3')),
  lose:    makePlayer(require('../../../assets/sfx/lose.mp3')),
};

try {
  // playsInSilentMode:false → respect the iOS silent switch.
  setAudioModeAsync({ playsInSilentMode: false });
} catch (e) {
  console.warn('[feedback] setAudioModeAsync failed', e);
}

function playSound(p: AudioPlayer | null) {
  if (!prefs.soundEnabled || !p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.warn('[feedback] play failed', e);
  }
}

function haptic(run: () => void) {
  if (!prefs.hapticsEnabled || Platform.OS === 'web') return;
  try {
    run();
  } catch (e) {
    console.warn('[feedback] haptic failed', e);
  }
}

export const feedback = {
  setPrefs(p: Settings) {
    prefs = p;
  },
  playCorrect() {
    playSound(players.correct);
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  playWrong() {
    playSound(players.wrong);
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  playWin() {
    playSound(players.win);
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  playLose() {
    playSound(players.lose);
  },
};
