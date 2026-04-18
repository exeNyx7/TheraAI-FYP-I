import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, Smile, Frown, Heart, Wind, Circle, Trash2, Loader2, Sparkles, Lightbulb, TrendingUp } from 'lucide-react';
import { getJournals, createJournal, deleteJournal } from '../../services/journalService';
import { useToast } from '../../contexts/ToastContext';

  const MOOD_CONFIG = {
    happy: { emoji: '😊', label: 'Happy', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    sad: { emoji: '😢', label: 'Sad', color: 'text-blue-500', bg: 'bg-blue-50' },
    anxious: { emoji: '😰', label: 'Anxious', color: 'text-purple-500', bg: 'bg-purple-50' },
    angry: { emoji: '😠', label: 'Angry', color: 'text-red-500', bg: 'bg-red-50' },
    calm: { emoji: '😌', label: 'Calm', color: 'text-teal-500', bg: 'bg-teal-50' },
    excited: { emoji: '🤩', label: 'Excited', color: 'text-pink-500', bg: 'bg-pink-50' },
    stressed: { emoji: '😫', label: 'Stressed', color: 'text-orange-500', bg: 'bg-orange-50' },
    neutral: { emoji: '😐', label: 'Neutral', color: 'text-gray-500', bg: 'bg-gray-50' },
  };

export default function JournalV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [insightsModal, setInsightsModal] = useState(null);
  
  // Modal state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/login');
      return;
    }
    fetchJournals();
  }, [user, navigate]);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const data = await getJournals(0, 100);
      setJournals(data);
    } catch (error) {
      console.error('Failed to fetch journals:', error);
      showError('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showError('Please fill in both title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      const newJournal = await createJournal({
        title: title.trim(),
        content: content.trim(),
        mood: selectedMood,
      });
      showSuccess('Your diary entry has been saved');
      setJournals([newJournal, ...journals]);
      setTitle('');
      setContent('');
      setSelectedMood('neutral');
      setModalOpen(false);
    } catch (error) {
      showError(error.message || 'Failed to save diary entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteJournal(id);
      setJournals(journals.filter((j) => j.id !== id));
      showSuccess('Diary entry deleted');
      setDeleteConfirm(null);
    } catch (error) {
      showError('Failed to delete entry');
    }
  };

  const filteredJournals = journals.filter((journal) => {
    const matchesSearch =
      (journal.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      journal.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = moodFilter === 'all' || journal.mood === moodFilter;
    return matchesSearch && matchesMood;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCopingSuggestions = (mood, sentiment) => {
    const suggestions = {
      anxious: [
        "Try the 5-4-3-2-1 grounding technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
        "Practice deep breathing: Breathe in for 4 counts, hold for 4, breathe out for 4.",
        "Take a short walk outside to help clear your mind.",
        "Write down your worries and rate how likely they are to happen.",
        "Listen to calming music or nature sounds."
      ],
      sad: [
        "Reach out to a trusted friend or family member for support.",
        "Engage in a physical activity, even a gentle walk can help.",
        "Practice self-compassion: Treat yourself with the same kindness you'd show a friend.",
        "Create a gratitude list of 3 things, no matter how small.",
        "Allow yourself to feel these emotions - they're valid and temporary."
      ],
      happy: [
        "Document this positive moment in detail to revisit later.",
        "Share your joy with others - positive emotions are contagious!",
        "Use this energy for a goal you've been putting off.",
        "Practice gratitude for the people and circumstances that contributed to this feeling.",
        "Take a moment to be fully present and savor this experience."
      ],
      calm: [
        "This is a great time for meditation or mindfulness practice.",
        "Reflect on what helped you achieve this peaceful state.",
        "Use this clarity to plan or make important decisions.",
        "Engage in creative activities like drawing, writing, or music.",
        "Practice appreciation for this moment of tranquility."
      ],
      neutral: [
        "Check in with yourself: What would bring more joy today?",
        "This is a good baseline to practice mindfulness.",
        "Consider trying something new or exploring a hobby.",
        "Reach out to connect with someone you haven't talked to recently.",
        "Reflect on your goals and what small step you can take today."
      ]
    };

    const negativeSentiment = sentiment < 0.3;
    
    if (negativeSentiment && mood !== 'anxious' && mood !== 'sad') {
      return suggestions['sad'];
    }

    return suggestions[mood] || suggestions['neutral'];
  };

  if (!user || user.role !== 'patient') {
    return null;
  }

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                  My Diary
                </h1>
                <p className="text-muted-foreground mt-2">
                  {journals.length} {journals.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <Button 
                onClick={() => setModalOpen(true)} 
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New Entry
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={moodFilter} onValueChange={setMoodFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Filter by mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  <SelectItem value="happy">😊 Happy</SelectItem>
                  <SelectItem value="sad">😢 Sad</SelectItem>
                  <SelectItem value="anxious">😰 Anxious</SelectItem>
                  <SelectItem value="angry">😠 Angry</SelectItem>
                  <SelectItem value="calm">😌 Calm</SelectItem>
                  <SelectItem value="excited">🤩 Excited</SelectItem>
                  <SelectItem value="stressed">😫 Stressed</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Journal list */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredJournals.length > 0 ? (
              <div className="grid gap-4">
                {filteredJournals.map((journal) => {
                  const moodConfig = MOOD_CONFIG[journal.mood] || MOOD_CONFIG.neutral;
                  
                  return (
                    <Card key={journal.id} className="p-6 hover:shadow-lg transition-all group border-l-4 border-l-primary/50 hover:border-l-primary">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <Link to={`/journal/${journal.id}`} className="flex-1">
                            <div>
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                {journal.title || 'Untitled Entry'}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatDate(journal.created_at)}
                              </p>
                            </div>
                          </Link>
                          <div className={`p-2 rounded-lg ${moodConfig.bg}`}>
                            <span className="text-2xl">{moodConfig.emoji}</span>
                          </div>
                        </div>

                        {/* Preview */}
                        <Link to={`/journal/${journal.id}`}>
                          <p className="text-sm text-foreground/80 line-clamp-2">{journal.content}</p>
                        </Link>

                        {/* Emotion Preview - Show top emotion if available */}
                        {journal.ai_analysis?.top_emotions && journal.ai_analysis.top_emotions.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {journal.ai_analysis.top_emotions.slice(0, 2).map((emotion, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-pink-500/10 text-pink-700 dark:text-pink-300 rounded-full text-xs flex items-center gap-1"
                              >
                                {emotion.label}
                                <span className="text-[10px] opacity-70">
                                  {(emotion.score * 100).toFixed(0)}%
                                </span>
                              </span>
                            ))}
                            {journal.ai_analysis.top_emotions.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{journal.ai_analysis.top_emotions.length - 2} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* AI Insights Badge */}
                        {journal.ai_analysis && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInsightsModal(journal);
                              }}
                            >
                              <Sparkles className="h-3 w-3 text-primary" />
                              <span className="text-xs">AI Insights</span>
                            </Button>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${moodConfig.bg} ${moodConfig.color}`}>
                              {moodConfig.label}
                            </span>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteConfirm(journal.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4">No entries found</p>
                <Button onClick={() => setModalOpen(true)} variant="outline">
                  Create your first entry
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Journal Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>
              Write a New Entry
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Entry Title
              </label>
              <Input
                id="title"
                placeholder="Give your entry a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">How are you feeling?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(MOOD_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMood(key)}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 hover:shadow-md ${
                      selectedMood === key
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-4xl">{config.emoji}</span>
                    <span className="text-xs font-medium text-center">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Your Thoughts
              </label>
              <Textarea
                id="content"
                placeholder="Write what's on your mind... There are no rules or judgment here."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-64"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setModalOpen(false)} 
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Entry?</h3>
            <p className="text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* AI Insights Modal */}
      {insightsModal && (
        <Dialog open={!!insightsModal} onOpenChange={() => setInsightsModal(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                <Sparkles className="h-6 w-6 text-primary" />
                AI Insights for Your Entry
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Entry Info */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-lg mb-2">{insightsModal.title || 'Untitled Entry'}</h3>
                <p className="text-sm text-muted-foreground mb-3">{formatDate(insightsModal.created_at)}</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const moodConfig = MOOD_CONFIG[insightsModal.mood] || MOOD_CONFIG.neutral;
                    return (
                      <>
                        <div className={`p-2 rounded-lg ${moodConfig.bg}`}>
                          <span className="text-xl">{moodConfig.emoji}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {moodConfig.label}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* AI Analysis */}
              {insightsModal.ai_analysis && (
                <div className="space-y-4">
                  {/* Summary */}
                  {insightsModal.ai_analysis.summary && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <h4 className="font-semibold">Summary</h4>
                      </div>
                      <p className="text-sm text-foreground/80 pl-7">
                        {insightsModal.ai_analysis.summary}
                      </p>
                    </div>
                  )}

                  {/* Sentiment */}
                  {insightsModal.ai_analysis.sentiment && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-rose-500" />
                        <h4 className="font-semibold">Emotional Tone</h4>
                      </div>
                      <div className="pl-7">
                        <p className="text-sm text-foreground/80 capitalize">
                          {insightsModal.ai_analysis.sentiment}
                        </p>
                        {insightsModal.ai_analysis.sentiment_score !== undefined && (
                          <div className="mt-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                                style={{ width: `${insightsModal.ai_analysis.sentiment_score * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Score: {(insightsModal.ai_analysis.sentiment_score * 10).toFixed(1)}/10
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Themes */}
                  {insightsModal.ai_analysis.themes && insightsModal.ai_analysis.themes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <h4 className="font-semibold">Key Themes</h4>
                      </div>
                      <div className="pl-7 flex flex-wrap gap-2">
                        {insightsModal.ai_analysis.themes.map((theme, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detected Emotions (RoBERTa) */}
                  {insightsModal.ai_analysis.top_emotions && insightsModal.ai_analysis.top_emotions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" />
                        <h4 className="font-semibold">Detected Emotions</h4>
                      </div>
                      <div className="pl-7 flex flex-wrap gap-2">
                        {insightsModal.ai_analysis.top_emotions.map((emotion, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-pink-500/10 text-pink-700 dark:text-pink-300 rounded-full text-sm flex items-center gap-2"
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
                </div>
              )}

              {/* Coping Suggestions */}
              <div className="space-y-3 p-4 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold">Personalized Coping Strategies</h4>
                </div>
                <ul className="space-y-2 pl-7">
                  {getCopingSuggestions(
                    insightsModal.mood,
                    insightsModal.ai_analysis?.sentiment_score || 0.5
                  ).map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions from AI */}
              {insightsModal.ai_analysis?.suggestions && insightsModal.ai_analysis.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold">AI Recommendations</h4>
                  </div>
                  <ul className="space-y-2 pl-7">
                    {insightsModal.ai_analysis.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">→</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setInsightsModal(null)} className="bg-primary hover:bg-primary/90">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
