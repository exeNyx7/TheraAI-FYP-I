import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Trash2, Share2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Smile, Frown, Heart, Wind, Circle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const moodIcons  = { happy: Smile, sad: Frown, anxious: Heart, calm: Wind, neutral: Circle };
const moodColors = {
  happy:   'text-yellow-500 bg-yellow-500/10',
  sad:     'text-blue-500 bg-blue-500/10',
  anxious: 'text-red-500 bg-red-500/10',
  calm:    'text-teal-500 bg-teal-500/10',
  neutral: 'text-gray-500 bg-muted',
};
const moodLabels = { happy: 'Happy', sad: 'Sad', anxious: 'Anxious', calm: 'Calm', neutral: 'Neutral' };

export function JournalCard({ journal, onDelete }) {
  const { showSuccess } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const MoodIcon  = moodIcons[journal.mood]  || Circle;
  const moodColor = moodColors[journal.mood] || moodColors.neutral;

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `${journal.title}\n\n${journal.content}`;
    if (navigator.share) {
      try { await navigator.share({ title: journal.title, text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied to clipboard!');
    }
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirmDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(false);
    onDelete?.(journal._id || journal.id);
  };

  return (
    <>
      <Link to={`/journal/${journal._id || journal.id}`} className="block">
        <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group border-l-4 border-l-primary/40 hover:border-l-primary rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{journal.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(journal.created_at || journal.date)}
                </p>
              </div>
              <div className={`p-2 rounded-xl ${moodColor}`}>
                <MoodIcon className="h-5 w-5" />
              </div>
            </div>

            <p className="text-sm text-foreground/80 line-clamp-2">{journal.content}</p>

            <div className="flex items-center gap-2 flex-wrap">
              {journal.ai_analysis?.sentiment_label && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {journal.ai_analysis.sentiment_label}
                </span>
              )}
              {journal.ai_insight && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInsightOpen(v => !v); }}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Insight
                  {insightOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>

            {/* Expanded AI insight */}
            {insightOpen && journal.ai_insight && (
              <div
                className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-2"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <p className="text-xs text-foreground leading-relaxed">{journal.ai_insight}</p>
                {journal.ai_suggestion && (
                  <p className="text-xs text-muted-foreground italic border-t border-purple-200 dark:border-purple-800 pt-2">
                    {journal.ai_suggestion}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className={`text-xs px-2.5 py-1 rounded-full ${moodColor}`}>
                {moodLabels[journal.mood] || journal.mood}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon-sm" variant="ghost" onClick={handleShare} title="Share">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteClick}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </Link>

      {/* Delete confirmation */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold">Delete this entry?</h3>
            <p className="text-sm text-muted-foreground">
              "<span className="font-medium text-foreground">{journal.title}</span>" will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmOpen(false); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
