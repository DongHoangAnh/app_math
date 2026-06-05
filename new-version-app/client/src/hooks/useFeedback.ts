import { feedback } from '../services/feedback';

// Thin wrapper so screens depend on a hook (repo convention) rather than the
// service module directly. Prefs gating lives in feedback.ts.
export function useFeedback() {
  return {
    correct: () => feedback.playCorrect(),
    wrong:   () => feedback.playWrong(),
    win:     () => feedback.playWin(),
    lose:    () => feedback.playLose(),
  };
}
