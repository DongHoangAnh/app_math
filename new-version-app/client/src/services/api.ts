/**
 * API service — the single place that talks to the backend REST API.
 *
 * Every call goes through `authFetch` (attaches the Supabase bearer token)
 * and a shared `request()` helper that builds the URL from config and
 * throws `ApiError` on non-2xx responses. Screens/hooks call the typed
 * `gameApi` methods instead of hand-rolling fetch + URL + auth each time.
 */

import { API_URL } from '../config';
import { authFetch } from '../utils/authFetch';

/** Thrown when the backend returns a non-2xx response. Carries the status. */
export class ApiError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'ApiError';
  }
}

// ═══════════════════════════════════════════════════════════
// RESPONSE DTOs — the API contract, shared by all consumers.
// ═══════════════════════════════════════════════════════════

export interface GameStatsResponse {
  totalMatches: number;
  totalWins: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  bestStreak: number;
  currentStreak: number;
  level: number;
  nextLevelProgress: number;
  accuracyRate: number;
  avgTimePerMatch: number;
}

// Public profile exposes the same stat shape.
export type PublicPlayerStats = GameStatsResponse;

export interface PublicProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  rankingPoints: number;
  allowViewingInfo: boolean;
  stats: PublicPlayerStats | null;
}

export interface MatchHistoryItem {
  id: string;
  roomId: string;
  playedAt: string;
  opponentId: string;
  opponentName: string;
  opponentAvatarUrl: string | null;
  myScore: number;
  opponentScore: number;
  myCorrect: number;
  opponentCorrect: number;
  outcome: 'win' | 'lose' | 'draw';
  rankingDelta: number;
  questionsCount: number;
  difficulty: number;
}

export interface DailyTask {
  task_key: string;
  title: string;
  description: string;
  exp_reward: number;
  progress: number;
  target: number;
  completed: boolean;
  exp_claimed: boolean;
}

export interface ClaimResult {
  exp: number;
  level: number;
}

export interface AcquireLockResult {
  granted: boolean;
}

export interface HeartbeatResult {
  owner: boolean;
}

// ═══════════════════════════════════════════════════════════
// CORE — auth + URL + JSON in one place.
// ═══════════════════════════════════════════════════════════

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(`${API_URL}${path}`, options);
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}

// ═══════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════

export const gameApi = {
  getStats: (userId: string) =>
    request<GameStatsResponse>(`/api/gameshow/stats/${userId}`),

  getOpponentProfile: (opponentId: string) =>
    request<PublicProfile>(`/api/gameshow/profile/${opponentId}`),

  getMatchHistory: (userId: string, limit: number, offset: number) =>
    request<MatchHistoryItem[]>(
      `/api/gameshow/matches/${userId}?limit=${limit}&offset=${offset}`,
    ),

  getDailyTasks: (userId: string) =>
    request<DailyTask[]>(`/api/daily-tasks/${userId}`),

  claimDailyTask: (userId: string, taskKey: string, displayName: string) =>
    request<ClaimResult>(`/api/daily-tasks/${userId}/claim/${taskKey}`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  // `force` = login takeover (new device wins): claim even if another device
  // holds a warm lock. Heartbeat re-acquire leaves it false (conservative).
  acquireLock: (deviceId: string, force = false) =>
    request<AcquireLockResult>(`/api/session/acquire`, {
      method: 'POST',
      body: JSON.stringify({ deviceId, force }),
    }),

  heartbeat: (deviceId: string) =>
    request<HeartbeatResult>(`/api/session/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    }),

  releaseLock: (deviceId: string) =>
    request<{ ok: boolean }>(`/api/session/release`, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    }),
};
