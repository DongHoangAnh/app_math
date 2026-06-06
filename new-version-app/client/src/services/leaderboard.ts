/**
 * Leaderboard data layer.
 *
 * The ranking *ordering* is intentionally cached on-device with a 15-minute
 * TTL — positions only shuffle every 15 min (or on an explicit pull-to-refresh),
 * which keeps the board stable instead of churning on every open. The signed-in
 * user's OWN points/rank are fetched live (see `fetchMyRank`) and shown in their
 * highlighted card, so their score always reflects the latest value even while
 * the list itself is a 15-min snapshot.
 *
 * Reads go straight through the Supabase client (anon key + RLS), matching the
 * rest of the leaderboard's existing data access — this is not a REST endpoint.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  ranking_points: number;
}

export interface MyRankInfo {
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  /** 1-based global rank; 0 when it couldn't be determined. */
  rank: number;
}

/** Only the top 100 players are listed; everyone else sees a bucketed rank. */
export const TOP_LIMIT = 100;
export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = '@mathup/leaderboard';

interface CachedList {
  entries: LeaderboardEntry[];
  cachedAt: number;
}

async function fetchTop(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, ranking_points')
    .order('ranking_points', { ascending: false })
    .limit(TOP_LIMIT);
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

/**
 * Top-100 ranking list. Returns the cached snapshot while it's < 15 min old;
 * otherwise (or when `force` is true) refetches and re-stamps the cache.
 */
export async function getTopRanks(force = false): Promise<LeaderboardEntry[]> {
  const now = Date.now();
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedList;
        if (
          Array.isArray(cached.entries) &&
          typeof cached.cachedAt === 'number' &&
          now - cached.cachedAt < CACHE_TTL_MS
        ) {
          return cached.entries;
        }
      }
    } catch {
      // Corrupt/absent cache — fall through to a live fetch.
    }
  }

  const entries = await fetchTop();
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ entries, cachedAt: now }));
  } catch {
    // Best-effort cache; never let persistence failure break the board.
  }
  return entries;
}

/**
 * The signed-in user's live points and global rank. Rank is the count of
 * players with strictly more points, plus one (best rank among ties).
 */
export async function fetchMyRank(userId: string): Promise<MyRankInfo | null> {
  const { data: me, error: meErr } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url, ranking_points')
    .eq('id', userId)
    .single();
  if (meErr || !me) return null;

  const points = me.ranking_points ?? 0;

  const { count, error: countErr } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .gt('ranking_points', points);

  return {
    displayName: me.display_name ?? null,
    avatarUrl: me.avatar_url ?? null,
    points,
    rank: countErr ? 0 : (count ?? 0) + 1,
  };
}

/**
 * Display a rank exactly when it's in the top 100, otherwise bucket it into
 * 100+ / 500+ / 1000+ / 5000+ (the lower threshold the rank has passed).
 */
export function formatRank(rank: number): string {
  if (rank <= 0) return '—';
  if (rank <= TOP_LIMIT) return `#${rank}`;
  if (rank <= 500) return '100+';
  if (rank <= 1000) return '500+';
  if (rank <= 5000) return '1000+';
  return '5000+';
}
