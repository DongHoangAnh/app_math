import { useState, useEffect, useCallback } from 'react';
import { gameApi, type DailyTask } from '../services/api';

// Re-export so existing importers (e.g. HomeScreen) keep working.
export type { DailyTask };

export function useDailyTasks(userId: string | null, displayName?: string) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null); // taskKey being claimed

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await gameApi.getDailyTasks(userId);
      if (Array.isArray(data)) setTasks(data);
    } catch {
      // silent — tasks are non-critical
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const claimExp = useCallback(
    async (taskKey: string): Promise<{ exp: number; level: number } | null> => {
      if (!userId || claiming) return null;
      setClaiming(taskKey);
      try {
        const result = await gameApi.claimDailyTask(userId, taskKey, displayName ?? 'Player');
        // Optimistically update local state
        setTasks((prev) =>
          prev.map((t) => (t.task_key === taskKey ? { ...t, exp_claimed: true } : t))
        );
        return result;
      } catch {
        return null;
      } finally {
        setClaiming(null);
      }
    },
    [userId, displayName, claiming]
  );

  const totalExp = tasks.reduce((s, t) => s + (t.exp_claimed ? t.exp_reward : 0), 0);
  const maxExp = tasks.reduce((s, t) => s + t.exp_reward, 0);
  const completedCount = tasks.filter((t) => t.completed).length;
  const claimedCount = tasks.filter((t) => t.exp_claimed).length;

  return { tasks, loading, claiming, claimExp, refetch: fetch, totalExp, maxExp, completedCount, claimedCount };
}
