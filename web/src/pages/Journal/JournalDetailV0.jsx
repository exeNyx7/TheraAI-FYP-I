import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ArrowLeft, Share2, Trash2, Loader2, Smile, Frown, Heart, Wind, Circle } from 'lucide-react';
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
      showError('Failed to load journal entry');
      navigate('/journal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteJournal(id);
      showSuccess('Journal entry deleted');
      navigate('/journal');
    } catch (error) {
      showError('Failed to delete entry');
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
      <div className="flex">
        <SidebarNav />
        <main className="flex-1 sidebar-content">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="flex">
        <SidebarNav />
        <main className="flex-1 sidebar-content">
          <div className="max-w-4xl mx-auto p-6 md:p-8 text-center">
            <p className="text-muted-foreground text-lg mb-4">Entry not found</p>
            <Link to="/journal">
              <Button variant="outline" className="bg-transparent">
                Back to Journal
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const MoodIcon = moodIcons[journal.mood] || Smile;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
            {/* Back button */}
            <Link to="/journal">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Journal
              </Button>
            </Link>

            {/* Entry content */}
            <Card className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold" style={{ fontFamily: 'Montserrat' }}>
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

              {/* AI Insights */}
              {journal.ai_analysis && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <h3 className="font-semibold mb-3 text-primary" style={{ fontFamily: 'Montserrat' }}>
                    AI Insights
                  </h3>
                  <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                    {journal.ai_analysis.summary && (
                      <p><strong>Summary:</strong> {journal.ai_analysis.summary}</p>
                    )}
                    {journal.ai_analysis.sentiment && (
                      <p><strong>Sentiment:</strong> {journal.ai_analysis.sentiment}</p>
                    )}
                    {journal.ai_analysis.themes && journal.ai_analysis.themes.length > 0 && (
                      <p><strong>Themes:</strong> {journal.ai_analysis.themes.join(', ')}</p>
                    )}
                    {journal.ai_analysis.suggestions && journal.ai_analysis.suggestions.length > 0 && (
                      <div>
                        <strong>Suggestions:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {journal.ai_analysis.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 border-t border-border pt-6">
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive bg-transparent"
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
