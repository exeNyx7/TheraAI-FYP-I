import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Flame, Target, Zap } from 'lucide-react';

const MOOD_CONFIG = {
  happy:    { label: 'Happy',    emoji: '😊', sub: 'Feeling great!',    color: 'text-yellow-500',  bg: 'from-yellow-500/15 via-yellow-500/5',  border: 'border-yellow-500/20 hover:border-yellow-500/50' },
  sad:      { label: 'Sad',      emoji: '😔', sub: 'You got this',      color: 'text-blue-500',    bg: 'from-blue-500/15 via-blue-500/5',      border: 'border-blue-500/20 hover:border-blue-500/50' },
  anxious:  { label: 'Anxious',  emoji: '😰', sub: 'Breathe deeply',    color: 'text-orange-500',  bg: 'from-orange-500/15 via-orange-500/5',  border: 'border-orange-500/20 hover:border-orange-500/50' },
  calm:     { label: 'Calm',     emoji: '😌', sub: 'Nice & balanced',   color: 'text-teal-500',    bg: 'from-teal-500/15 via-teal-500/5',      border: 'border-teal-500/20 hover:border-teal-500/50' },
  neutral:  { label: 'Neutral',  emoji: '😐', sub: 'Steady as ever',    color: 'text-gray-500',    bg: 'from-gray-500/15 via-gray-500/5',      border: 'border-gray-500/20 hover:border-gray-500/50' },
  angry:    { label: 'Angry',    emoji: '😠', sub: 'Take a breath',     color: 'text-red-500',     bg: 'from-red-500/15 via-red-500/5',        border: 'border-red-500/20 hover:border-red-500/50' },
  stressed: { label: 'Stressed', emoji: '😤', sub: 'Take a break',      color: 'text-orange-600',  bg: 'from-orange-600/15 via-orange-600/5',  border: 'border-orange-600/20 hover:border-orange-600/50' },
  excited:  { label: 'Excited',  emoji: '🤩', sub: 'Keep the energy!',  color: 'text-purple-500',  bg: 'from-purple-500/15 via-purple-500/5',  border: 'border-purple-500/20 hover:border-purple-500/50' },
};

function streakSubtitle(streak) {
  if (streak === 0) return 'Start today!';
  if (streak === 1) return 'Good start!';
  if (streak < 7)  return 'Keep it up!';
  if (streak < 30) return 'On fire 🔥';
  return 'Legendary!';
}

function wellnessLabel(score) {
  if (score <= 0)  return '—';
  if (score <= 30) return 'Needs care';
  if (score <= 50) return 'Getting there';
  if (score <= 70) return 'Doing well';
  if (score <= 85) return 'Great!';
  return 'Excellent!';
}

export function DashboardHeader({ stats }) {
  const { user } = useAuth();
  const displayName = user?.full_name?.split(' ')[0] || user?.name || 'there';

  const mood = MOOD_CONFIG[stats?.currentMood?.toLowerCase()] || MOOD_CONFIG.neutral;
  const streak = stats?.streak ?? 0;
  const goalsCompleted = stats?.goalsCompleted ?? 0;
  const totalGoals = stats?.totalGoals ?? 5;
  const wellnessScore = stats?.wellnessScore != null ? Math.min(100, Math.round(stats.wellnessScore * 10)) : 0;
  const goalsLeft = Math.max(0, totalGoals - goalsCompleted);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <h1
          className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
          style={{ fontFamily: 'Montserrat' }}
        >
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-muted-foreground">Let's continue your mental wellness journey today</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Mood */}
        <Card className={`p-5 bg-gradient-to-br ${mood.bg} to-transparent border-2 ${mood.border} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Mood</p>
              <p className={`text-2xl font-bold ${mood.color}`} style={{ fontFamily: 'Montserrat' }}>
                {mood.label}
              </p>
              <p className="text-xs text-muted-foreground">{mood.sub}</p>
            </div>
            <span className="text-3xl select-none">{mood.emoji}</span>
          </div>
        </Card>

        {/* Streak */}
        <Card className="p-5 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent border-2 border-orange-500/20 hover:border-orange-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Streak</p>
              <p className="text-2xl font-bold text-orange-500" style={{ fontFamily: 'Montserrat' }}>
                {streak} {streak === 1 ? 'day' : 'days'}
              </p>
              <p className="text-xs text-muted-foreground">{streakSubtitle(streak)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </Card>

        {/* Weekly Goal */}
        <Card className="p-5 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border-2 border-blue-500/20 hover:border-blue-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weekly Goal</p>
              <p className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Montserrat' }}>
                {goalsCompleted}/{totalGoals}
              </p>
              <p className="text-xs text-muted-foreground">
                {goalsLeft === 0 ? 'Goal met! 🎉' : `${goalsLeft} to go`}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-blue-500/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (goalsCompleted / totalGoals) * 100)}%` }}
            />
          </div>
        </Card>

        {/* Wellness Score */}
        <Card className="p-5 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border-2 border-purple-500/20 hover:border-purple-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wellness Score</p>
              <p className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'Montserrat' }}>
                {wellnessScore > 0 ? `${wellnessScore}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">{wellnessLabel(wellnessScore)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {wellnessScore > 0 && (
            <div className="mt-3 h-1.5 bg-purple-500/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${wellnessScore}%` }}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
