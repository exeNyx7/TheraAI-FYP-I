import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Smile, TrendingUp, Target, Zap } from 'lucide-react';

export function DashboardHeader({ stats }) {
  const { user } = useAuth();

  // Get stats with defaults
  const streak = stats?.streak || 0;
  const goalsCompleted = stats?.goalsCompleted || 0;
  const totalGoals = stats?.totalGoals || 5;
  const wellnessScore = stats?.wellnessScore || stats?.moodScore || 0;
  const currentMood = stats?.currentMood || 'Neutral';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1
          className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
          style={{ fontFamily: 'Montserrat' }}
        >
          Welcome back, {user?.full_name || user?.name || 'there'}
        </h1>
        <p className="text-lg text-muted-foreground">Let's continue your mental wellness journey today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Today's Mood</p>
              <p className="text-3xl font-bold text-primary" style={{ fontFamily: 'Montserrat' }}>
                {currentMood}
              </p>
              <p className="text-xs text-muted-foreground pt-1">Feeling positive</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
              <Smile className="h-7 w-7 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent border-2 border-orange-500/20 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Streak</p>
              <p className="text-3xl font-bold text-orange-600" style={{ fontFamily: 'Montserrat' }}>
                {streak} {streak === 1 ? 'day' : 'days'}
              </p>
              <p className="text-xs text-muted-foreground pt-1">Keep it up!</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-orange-500/20 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border-2 border-blue-500/20 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Goals</p>
              <p className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'Montserrat' }}>
                {goalsCompleted}/{totalGoals}
              </p>
              <p className="text-xs text-muted-foreground pt-1">{totalGoals - goalsCompleted} to go</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border-2 border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Score</p>
              <p className="text-3xl font-bold text-purple-600" style={{ fontFamily: 'Montserrat' }}>
                {wellnessScore}%
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                {wellnessScore >= 80 ? 'Excellent' : wellnessScore >= 60 ? 'Good' : 'Keep going'}
              </p>
            </div>
            <div className="h-14 w-14 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="h-7 w-7 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
