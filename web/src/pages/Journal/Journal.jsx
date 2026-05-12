import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AddJournalModal } from '../../components/Journal/AddJournalModal';
import { JournalCard } from '../../components/Journal/JournalCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, BookOpen, X, AlertTriangle, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

const CRISIS_COLORS = {
  emergency: { bg: 'bg-red-50 border-red-400 dark:bg-red-950/40', icon: 'text-red-500', title: 'text-red-700 dark:text-red-400' },
  high:      { bg: 'bg-orange-50 border-orange-400 dark:bg-orange-950/40', icon: 'text-orange-500', title: 'text-orange-700 dark:text-orange-400' },
  moderate:  { bg: 'bg-yellow-50 border-yellow-400 dark:bg-yellow-950/40', icon: 'text-yellow-600', title: 'text-yellow-700 dark:text-yellow-400' },
};

function CrisisBanner({ severity, onDismiss, onBookTherapist }) {
  const c = CRISIS_COLORS[severity] || CRISIS_COLORS.moderate;
  const isUrgent = severity === 'emergency' || severity === 'high';
  return (
    <div className={`border-l-4 rounded-lg p-4 flex gap-3 ${c.bg}`}>
      <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${c.icon}`} />
      <div className="flex-1 space-y-2">
        <p className={`font-semibold ${c.title}`}>
          {severity === 'emergency' ? 'We noticed something concerning in your entry' :
           severity === 'high' ? 'Your entry suggests you may be struggling' :
           'Your entry reflects some distress'}
        </p>
        <p className="text-sm text-muted-foreground">
          You are not alone. Reaching out is a sign of strength.
          {isUrgent && ' If you are in immediate danger, please contact emergency services.'}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs bg-background border rounded-full px-3 py-1 font-medium">
            <Phone className="h-3 w-3" /> Pakistan: Umang 0317-4288665
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-background border rounded-full px-3 py-1 font-medium">
            <Phone className="h-3 w-3" /> Rozan Counseling: 051-2890505
          </span>
          {isUrgent && (
            <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90" onClick={onBookTherapist}>
              Book a Therapist
            </Button>
          )}
        </div>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Journal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  const [crisisAlert, setCrisisAlert] = useState(null); // { severity, show_book_therapist }

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchJournals();
  }, [user]);

  const fetchJournals = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/journals');
      const data = res.data;
      setJournals(Array.isArray(data) ? data : data.journals || []);
    } catch { showError('Failed to load journals.'); }
    finally { setIsLoading(false); }
  };

  const handleCreate = async (entry) => {
    try {
      const res = await apiClient.post('/journals', entry);
      await fetchJournals();
      if (res.data?.crisis_detected) {
        setCrisisAlert({
          severity: res.data.crisis_severity,
          show_book_therapist: res.data.crisis_severity === 'high' || res.data.crisis_severity === 'emergency',
        });
      }
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to create diary entry.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/journals/${id}`);
      setJournals(prev => prev.filter(j => (j._id || j.id) !== id));
      showSuccess('Diary entry deleted.');
    } catch { showError('Failed to delete entry.'); }
  };

  const filtered = journals.filter((j) => {
    const matchSearch = j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMood = moodFilter === 'all' || j.mood === moodFilter;
    return matchSearch && matchMood;
  });

  if (!user) return null;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>My Diary</h1>
                <p className="text-muted-foreground mt-2">
                  {journals.length} {journals.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <Button onClick={() => setModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" /> New Entry
              </Button>
            </div>

            {/* Crisis banner */}
            {crisisAlert && (
              <CrisisBanner
                severity={crisisAlert.severity}
                onDismiss={() => setCrisisAlert(null)}
                onBookTherapist={() => { setCrisisAlert(null); navigate('/appointments'); }}
              />
            )}

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
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Filter by mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  <SelectItem value="happy">Happy</SelectItem>
                  <SelectItem value="sad">Sad</SelectItem>
                  <SelectItem value="anxious">Anxious</SelectItem>
                  <SelectItem value="calm">Calm</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="stressed">Stressed</SelectItem>
                  <SelectItem value="angry">Angry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Journal list */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid gap-4">
                {filtered.map((journal) => (
                  <JournalCard key={journal._id || journal.id} journal={journal} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  {searchQuery || moodFilter !== 'all' ? 'No entries match your filters' : 'No diary entries yet'}
                </p>
                <Button onClick={() => setModalOpen(true)} variant="outline">
                  Create your first entry
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AddJournalModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCreate} />
    </div>
  );
}
