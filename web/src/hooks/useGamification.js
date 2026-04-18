/**
 * useGamification — fetches and caches gamification data (XP, level, streak, achievements).
 * Fires 'achievement:unlocked' CustomEvents for newly unlocked achievements so the
 * AchievementUnlockPopup and NotificationPopup can react without prop drilling.
 */
import { useState, useCallback, useRef } from 'react';
import apiClient from '../apiClient';

const LS_KEY = 'theraai_seen_achievements';

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); } catch { return new Set(); }
}
function saveSeenIds(ids) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch {}
}

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

      const prevSummary = prevSummaryRef.current;
      const xpDelta = prevSummary ? newSummary.xp - prevSummary.xp : 0;
      const levelUp = prevSummary ? newSummary.level > prevSummary.level : false;

      // Detect newly unlocked achievements using both localStorage and previous fetch
      const seenIds = getSeenIds();
      const prevUnlocked = new Set(prevSummary?.unlocked_achievements || []);

      const newlyUnlocked = newAchievements.filter(
        a => a.unlocked && !seenIds.has(a.id)
      );

      // Fire events for each newly unlocked achievement
      newlyUnlocked.forEach(ach => {
        // confetti + popup
        window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: ach }));
        // in-app notification bell
        window.dispatchEvent(new CustomEvent('notification:new', {
          detail: {
            id: `ach-${ach.id}-${Date.now()}`,
            type: 'achievement',
            title: `Achievement Unlocked: ${ach.title}`,
            body: `You earned +${ach.xp} XP!`,
          },
        }));
        seenIds.add(ach.id);
      });

      if (newlyUnlocked.length > 0) saveSeenIds(seenIds);

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
