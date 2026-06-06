/**
 * Achievement evaluation — pure helpers shared by Profile & Statistics.
 *
 * Each screen owns its own visual badge list; the *criteria* live here so an
 * achievement's "unlocked" state reflects real player progress instead of
 * always rendering as earned. Keep this file free of React / UI — it's just
 * the rules.
 */

export interface AchievementStats {
  totalMatches: number;
  totalWins: number;
  bestStreak: number;
  currentStreak: number;
  accuracyRate: number;    // 0–100
  avgTimePerMatch: number; // seconds
  level: number;
  rankingPoints: number;
}

export type AchievementId =
  | 'firstMatch'  // Bắt Đầu  — chơi trận đầu tiên
  | 'hotStreak'   // Nóng Lên / Streak 5 — chuỗi thắng ≥ 5
  | 'lucky'       // Nhân Phẩm — đạt 50 điểm xếp hạng
  | 'diamond'     // Kim Cương — đạt cấp 10
  | 'champion'    // Vô địch — thắng ≥ 10 trận
  | 'sniper'      // Bách phát — tỉ lệ trả lời đúng ≥ 90%
  | 'speed';      // Tốc độ — trung bình ≤ 60s/trận

/** Predicate per achievement id. */
export const ACHIEVEMENT_RULES: Record<AchievementId, (s: AchievementStats) => boolean> = {
  firstMatch: (s) => s.totalMatches >= 1,
  hotStreak:  (s) => s.bestStreak >= 5,
  lucky:      (s) => s.rankingPoints >= 50,
  diamond:    (s) => s.level >= 10,
  champion:   (s) => s.totalWins >= 10,
  sniper:     (s) => s.totalMatches > 0 && s.accuracyRate >= 90,
  speed:      (s) => s.totalMatches > 0 && s.avgTimePerMatch > 0 && s.avgTimePerMatch <= 60,
};

/** True when the player has earned the given achievement. */
export function isUnlocked(id: AchievementId, s: AchievementStats): boolean {
  return ACHIEVEMENT_RULES[id](s);
}
