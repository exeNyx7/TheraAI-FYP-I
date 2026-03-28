import { Trophy, Zap, BookOpen, MessageCircle, Calendar, Target, Star, Award, Moon, Sun, Flame, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const ACHIEVEMENTS = [
  { id: 'first_entry', name: 'First Step', description: 'Write your first journal entry', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10', xp: 50 },
  { id: 'streak_7', name: '7-Day Streak', description: 'Log in 7 days in a row', icon: Flame, color: 'text-orange-500 bg-orange-500/10', xp: 100 },
  { id: 'chat_10', name: 'Chat Master', description: 'Have 10 conversations with AI', icon: MessageCircle, color: 'text-purple-500 bg-purple-500/10', xp: 75 },
  { id: 'mood_log', name: 'Mood Tracker', description: 'Log your mood 5 times', icon: Heart, color: 'text-red-500 bg-red-500/10', xp: 50 },
  { id: 'early_bird', name: 'Early Bird', description: 'Log an entry before 9 AM', icon: Sun, color: 'text-yellow-500 bg-yellow-500/10', xp: 30 },
  { id: 'night_owl', name: 'Night Owl', description: 'Log an entry after 10 PM', icon: Moon, color: 'text-indigo-500 bg-indigo-500/10', xp: 30 },
  { id: 'assessment', name: 'Self-Aware', description: 'Complete your first assessment', icon: Trophy, color: 'text-emerald-500 bg-emerald-500/10', xp: 75 },
  { id: 'appointment', name: 'Session Booked', description: 'Book your first therapy session', icon: Calendar, color: 'text-teal-500 bg-teal-500/10', xp: 100 },
  { id: 'streak_30', name: 'Dedicated', description: '30-day streak', icon: Star, color: 'text-amber-500 bg-amber-500/10', xp: 250 },
  { id: 'entries_10', name: 'Journaling Hero', description: 'Write 10 journal entries', icon: Award, color: 'text-primary bg-primary/10', xp: 150 },
  { id: 'level_5', name: 'Level Up', description: 'Reach level 5', icon: Zap, color: 'text-violet-500 bg-violet-500/10', xp: 200 },
  { id: 'goals_week', name: 'Goal Getter', description: 'Complete all weekly goals', icon: Target, color: 'text-cyan-500 bg-cyan-500/10', xp: 120 },
];

export function AchievementTracker({ unlockedIds = [] }) {
  const unlocked = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
  const locked = ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id));
  const totalXP = unlocked.reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-primary/10 rounded-xl">
          <p className="text-3xl font-bold text-primary">{unlocked.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Unlocked</p>
        </div>
        <div className="p-4 bg-muted rounded-xl">
          <p className="text-3xl font-bold">{locked.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Remaining</p>
        </div>
        <div className="p-4 bg-yellow-500/10 rounded-xl">
          <p className="text-3xl font-bold text-yellow-600">{totalXP}</p>
          <p className="text-sm text-muted-foreground mt-1">XP Earned</p>
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Unlocked ({unlocked.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlocked.map((ach) => {
              const Icon = ach.icon;
              return (
                <Card key={ach.id} className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ach.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{ach.name}</p>
                        <p className="text-xs text-muted-foreground">{ach.description}</p>
                        <p className="text-xs text-primary font-medium mt-1">+{ach.xp} XP</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Locked ({locked.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locked.map((ach) => {
            const Icon = ach.icon;
            return (
              <Card key={ach.id} className="opacity-50 border-border grayscale">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{ach.name}</p>
                      <p className="text-xs text-muted-foreground">{ach.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">+{ach.xp} XP</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
