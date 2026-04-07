/**
 * WeeklyMoodSummary
 * Shows a 7-day bar chart of average mood scores + AI-generated insight.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from 'lucide-react';
import { getWeeklySummary } from '../../services/statsService';

const MOOD_BAR_COLOR = {
  0: 'bg-muted',
  3: 'bg-red-400',
  5: 'bg-yellow-400',
  7: 'bg-blue-400',
  9: 'bg-green-400',
};

function getBarColor(score) {
  if (score === 0) return 'bg-muted/40';
  if (score <= 3) return 'bg-red-400/80';
  if (score <= 5) return 'bg-yellow-400/80';
  if (score <= 7) return 'bg-blue-400/80';
  return 'bg-green-400/80';
}

function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-orange-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeeklyMoodSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklySummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const maxScore = 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">This Week's Mood</CardTitle>
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={summary.trend} />
            <span className="text-xs text-muted-foreground capitalize">{summary.trend}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar chart */}
        <div className="flex items-end gap-1.5 h-20">
          {summary.days.map((day) => {
            const dayLabel = DAY_LABELS[new Date(day.date).getDay()];
            const heightPct = day.avg_sentiment > 0 ? (day.avg_sentiment / maxScore) * 100 : 4;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '64px' }}>
                  <div
                    className={`w-full rounded-t-sm transition-all ${getBarColor(day.avg_sentiment)}`}
                    style={{ height: `${heightPct}%` }}
                    title={day.avg_sentiment > 0 ? `${day.avg_sentiment}/10 · ${day.entry_count} entry` : 'No entries'}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>Avg: <strong className="text-foreground">{summary.week_avg}/10</strong></span>
          <span>{summary.total_entries} entries</span>
          {summary.best_day && (
            <span>Best: <strong className="text-foreground">{new Date(summary.best_day).toLocaleDateString('en', { weekday: 'short' })}</strong></span>
          )}
        </div>

        {/* AI insight */}
        <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3 border border-primary/10">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">{summary.ai_summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
