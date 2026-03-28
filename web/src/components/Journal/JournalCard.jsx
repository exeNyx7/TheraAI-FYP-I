import { Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Trash2, Share2 } from 'lucide-react';
import { Smile, Frown, Heart, Wind, Circle } from 'lucide-react';

const moodIcons = { happy: Smile, sad: Frown, anxious: Heart, calm: Wind, neutral: Circle };
const moodColors = {
  happy: 'text-yellow-500 bg-yellow-500/10',
  sad: 'text-blue-500 bg-blue-500/10',
  anxious: 'text-red-500 bg-red-500/10',
  calm: 'text-teal-500 bg-teal-500/10',
  neutral: 'text-gray-500 bg-gray-500/10',
};
const moodLabels = { happy: 'Happy', sad: 'Sad', anxious: 'Anxious', calm: 'Calm', neutral: 'Neutral' };

export function JournalCard({ journal, onDelete }) {
  const MoodIcon = moodIcons[journal.mood] || Circle;
  const moodColor = moodColors[journal.mood] || moodColors.neutral;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Link to={`/journal/${journal._id || journal.id}`} className="block">
      <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group border-l-4 border-l-primary/50 hover:border-l-primary">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{journal.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(journal.created_at || journal.date)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${moodColor}`}>
              <MoodIcon className="h-5 w-5" />
            </div>
          </div>

          {/* Preview */}
          <p className="text-sm text-foreground/80 line-clamp-2">{journal.content}</p>

          {/* AI Analysis Badge */}
          {journal.ai_analysis?.sentiment_label && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                AI: {journal.ai_analysis.sentiment_label}
              </span>
              {journal.ai_analysis.top_emotions?.[0] && (
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {journal.ai_analysis.top_emotions[0]}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${moodColor}`}>
                {moodLabels[journal.mood] || journal.mood}
              </span>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.(journal._id || journal.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
