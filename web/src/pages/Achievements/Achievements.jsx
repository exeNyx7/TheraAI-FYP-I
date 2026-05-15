import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGamification } from '../../hooks/useGamification';
import { Flame, Star, Trophy, Lock, Zap } from 'lucide-react';
import { Card } from '../../components/ui/card';

// XP bar component
function XpBar({ xp, xpInLevel, xpPerLevel, level }) {
  const pct = Math.min(100, (xpInLevel / xpPerLevel) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Level {level}</span>
        <span>{xpInLevel} / {xpPerLevel} XP</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-xs text-muted-foreground">
        {Math.round(pct)}% to Level {level + 1}
      </div>
    </div>
  );
}

// Single achievement card
function AchievementCard({ achievement, index }) {
  const { id, title, xp, unlocked } = achievement;

  // Icon mapping
  const ICONS = {
    first_journal: '📓', journal_7: '📝', journal_30: '📚',
    first_mood: '😊', mood_7: '🌈',
    streak_7: '🔥', streak_30: '⚡',
    first_assessment: '🧠', assessment_5: '🏆',
    first_chat: '💬', chat_10: '🗣️',
    level_5: '🌟',
  };
  const icon = ICONS[id] || '🏅';

  return (
    <div
      className={`relative rounded-xl border-2 p-4 transition-all duration-500 ${
        unlocked
          ? 'border-primary/50 bg-primary/5 shadow-sm hover:shadow-md hover:-translate-y-0.5'
          : 'border-border bg-muted/30 opacity-60'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${!unlocked ? 'grayscale' : ''}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">+{xp} XP</p>
        </div>
        {unlocked ? (
          <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      {unlocked && (
        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );
}

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { summary, achievements, loading, refresh } = useGamification();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    refresh();
  }, [user, navigate]);

  if (!user) return null;

  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 lg:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">

            {/* Header */}
            <div>
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
                style={{ fontFamily: 'Montserrat' }}
              >
                Achievements
              </h1>
              <p className="text-muted-foreground mt-2">
                Earn XP, level up, and unlock achievements on your wellness journey
              </p>
            </div>

            {loading && !summary ? (
              <div className="flex justify-center py-12">
                <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              </div>
            ) : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Level + XP */}
                  <Card className="p-5 col-span-1 sm:col-span-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total XP</p>
                        <p className="text-2xl font-bold">{(summary?.xp ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="ml-auto text-center">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                          <span className="text-xl font-bold text-primary-foreground">{summary?.level ?? 1}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Level</p>
                      </div>
                    </div>
                    <XpBar
                      xp={summary?.xp ?? 0}
                      xpInLevel={summary?.xp_in_current_level ?? 0}
                      xpPerLevel={summary?.xp_per_level ?? 500}
                      level={summary?.level ?? 1}
                    />
                  </Card>

                  {/* Streak */}
                  <Card className="p-5 flex flex-col items-center justify-center gap-2">
                    <Flame className="h-8 w-8 text-orange-500" />
                    <p className="text-3xl font-bold">{summary?.streak_days ?? 0}</p>
                    <p className="text-xs text-muted-foreground text-center">Day Streak</p>
                  </Card>
                </div>

                {/* Progress summary */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>{unlocked} of {total} achievements unlocked</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted ml-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-500/70 transition-all duration-1000"
                      style={{ width: total ? `${(unlocked / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                {/* Achievement grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((a, i) => (
                    <AchievementCard key={a.id} achievement={a} index={i} />
                  ))}
                  {achievements.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>Start journaling, tracking moods, and chatting to earn achievements!</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
