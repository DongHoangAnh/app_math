/**
 * useGameStats Hook - React Native
 * Fetch and manage game statistics
 */

import { useState, useEffect } from 'react';
import { gameApi } from '../services/api';

interface GameStats {
  totalMatches: number;
  totalWins: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  bestStreak: number;
  currentStreak: number;
  level: number;
}

export function useGameStats(userId: string | null) {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await gameApi.getStats(userId);
        setStats(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await gameApi.getStats(userId);
      setStats(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    error,
    refetch,
  };
}
