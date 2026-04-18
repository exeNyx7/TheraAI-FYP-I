import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ArrowLeft, Share2, Trash2, Loader2, Smile, Frown, Heart, Wind, Circle, Sparkles, TrendingUp } from 'lucide-react';
import { getJournalById, deleteJournal } from '../../services/journalService';
import { useToast } from '../../contexts/ToastContext';

const moodIcons = {
  happy: Smile,
  sad: Frown,
  anxious: Heart,
  calm: Wind,
  neutral: Circle,
};

const moodColors = {
  happy: 'bg-yellow-500/10 text-yellow-600',
  sad: 'bg-blue-500/10 text-blue-600',
  anxious: 'bg-red-500/10 text-red-600',
  calm: 'bg-teal-500/10 text-teal-600',
  neutral: 'bg-gray-500/10 text-gray-600',
};

export default function JournalDetailV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const { showSuccess, showError } = useToast();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/login');
      return;
    }
    fetchJournal();
  }, [user, navigate, id]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const data = await getJournalById(id);
      setJournal(data);
    } catch (error) {
      console.error('Failed to fetch journal:', error);
      showError('Failed to load diary entry');
      navigate('/journal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteJournal(id);
      showSuccess('Entry deleted.');
      navigate('/journal');
    } catch {
      showError('Failed to delete entry.');
    }
  };

  const handleShare = async () => {
    const text = `${journal.title}\n\n${journal.content}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: journal.title, text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied to clipboard!');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex bg-background min-h-screen">
        <AppSidebar />
        <main className="flex-1 bg-background">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="flex bg-background min-h-screen">
        <AppSidebar />
        <main className="flex-1 bg-background">
          <div className="max-w-4xl mx-auto p-6 md:p-8 text-center">
            <p className="text-muted-foreground text-lg mb-4">Entry not found</p>
            <Link to="/journal">
              <Button variant="outline">Back to Diary</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const MoodIcon = moodIcons[journal.mood] || Smile;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
            {/* Back button */}
            <Link to="/journal">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Diary
              </Button>
            </Link>

            {/* Entry content */}
            <Card className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                    {journal.title || 'Untitled Entry'}
                  </h1>
                  <p className="text-muted-foreground mt-2">{formatDate(journal.created_at)}</p>
                </div>
                <div className={`p-3 rounded-lg ${moodColors[journal.mood]}`}>
                  <MoodIcon className="h-6 w-6" />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{journal.content}</p>
              </div>

              {/* AI Insights - Enhanced */}
              {journal.ai_analysis && (
                <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-lg border border-primary/20">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Analysis
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Empathy Response */}
                    {journal.ai_analysis.summary && (
                      <div>
                        <p className="text-foreground/90 leading-relaxed">{journal.ai_analysis.summary}</p>
                      </div>
                    )}
                    
                    {/* Sentiment with visual bar */}
                    {journal.ai_analysis.sentiment && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Overall Sentiment: 
                            <span className="ml-2 capitalize text-primary">{journal.ai_analysis.sentiment}</span>
                          </p>
                          {journal.ai_analysis.sentiment_score !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {(journal.ai_analysis.sentiment_score * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                        {journal.ai_analysis.sentiment_score !== undefined && (
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                              style={{ width: `${journal.ai_analysis.sentiment_score * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Emotion Themes (RoBERTa) */}
                    {journal.ai_analysis.themes && journal.ai_analysis.themes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          Emotional Themes:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {journal.ai_analysis.themes.map((theme, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Top Emotions (RoBERTa) */}
                    {journal.ai_analysis.top_emotions && journal.ai_analysis.top_emotions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          Detected Emotions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {journal.ai_analysis.top_emotions.map((emotion, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-pink-500/10 text-pink-700 dark:text-pink-300 rounded-full text-sm font-medium flex items-center gap-2"
                            >
                              {emotion.label}
                              <span className="text-xs opacity-70">
                                {(emotion.score * 100).toFixed(0)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* AI Suggestions */}
                    {journal.ai_analysis.suggestions && journal.ai_analysis.suggestions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-primary/10">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          Suggestions:
                        </p>
                        <ul className="space-y-1">
                          {journal.ai_analysis.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                              <span className="text-primary mt-1">→</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 border-t border-border pt-6">
                <Button variant="outline" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Entry?</h3>
            <p className="text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
