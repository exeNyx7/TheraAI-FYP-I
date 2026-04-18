import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy } from 'lucide-react';

const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4'];

const ICONS = {
  first_journal: '📓', journal_7: '📝', journal_30: '📚',
  first_mood: '😊', mood_7: '🌈',
  streak_7: '🔥', streak_30: '⚡',
  first_assessment: '🧠', assessment_5: '🏆',
  first_chat: '💬', chat_10: '🗣️',
  level_5: '🌟',
};

function Particle({ x, color, delay, duration, size }) {
  return (
    <div
      className="absolute pointer-events-none animate-confetti-fall"
      style={{
        left: `${x}%`,
        top: -10,
        width: size,
        height: size * 0.45,
        borderRadius: 2,
        backgroundColor: color,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 1.5,
      size: 5 + Math.random() * 7,
    })),
  []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9997] overflow-hidden">
      {particles.map(p => <Particle key={p.id} {...p} />)}
    </div>
  );
}

function SinglePopup({ achievement, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  const icon = ICONS[achievement.id] || '🏅';

  return (
    <>
      <Confetti />
      <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
        <div className="animate-achievement-pop pointer-events-auto bg-background border-2 border-primary/40 rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs w-full mx-4 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400/30 to-primary/30 flex items-center justify-center text-4xl shadow-inner">
            {icon}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Achievement Unlocked!</p>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Montserrat' }}>{achievement.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">+{achievement.xp} XP earned</p>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 px-3 py-1.5 rounded-full text-xs font-semibold">
            <Trophy className="h-3.5 w-3.5" />
            Keep going!
          </div>
          <button
            onClick={onDone}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Mount once globally. Listens for 'achievement:unlocked' CustomEvents.
 * Each event.detail = { id, title, xp }
 */
export default function AchievementUnlockPopup() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const ach = e?.detail;
      if (!ach?.id) return;
      setQueue(q => [...q, { ...ach, _key: `${ach.id}-${Date.now()}` }]);
    };
    window.addEventListener('achievement:unlocked', handler);
    return () => window.removeEventListener('achievement:unlocked', handler);
  }, []);

  const advance = useCallback(() => {
    setQueue(q => q.slice(1));
  }, []);

  if (queue.length === 0) return null;
  return <SinglePopup key={queue[0]._key} achievement={queue[0]} onDone={advance} />;
}
