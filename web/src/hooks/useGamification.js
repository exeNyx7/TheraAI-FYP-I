/**
 * useGamification — fetches and caches gamification data (XP, level, streak, achievements).
 * Call refresh() after any action that awards XP to re-fetch and show toasts.
 */
import { useState, useCallback, useRef } from 'react';
import apiClient from '../apiClient';

export function useGamification() {
  const [summary, setSummary] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevSummaryRef = useRef(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, achRes] = await Promise.all([
        apiClient.get('/gamification/me'),
        apiClient.get('/gamification/achievements'),
      ]);
      const newSummary = sumRes.data;
      const newAchievements = achRes.data;

      // Calculate XP delta and newly unlocked achievements since last fetch
      const prevSummary = prevSummaryRef.current;
      const xpDelta = prevSummary ? newSummary.xp - prevSummary.xp : 0;
      const levelUp = prevSummary ? newSummary.level > prevSummary.level : false;

      const prevUnlocked = new Set(
        (prevSummary?.unlocked_achievements || [])
      );
      const newlyUnlocked = newAchievements.filter(
        a => a.unlocked && !prevUnlocked.has(a.id)
      );

      prevSummaryRef.current = newSummary;
      setSummary(newSummary);
      setAchievements(newAchievements);

      return { xpDelta, levelUp, newlyUnlocked };
    } catch (err) {
      console.warn('useGamification fetch failed', err);
      return { xpDelta: 0, levelUp: false, newlyUnlocked: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, achievements, loading, refresh: fetch };
}
