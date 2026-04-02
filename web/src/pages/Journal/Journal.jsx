import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AddJournalModal } from '../../components/Journal/AddJournalModal';
import { JournalCard } from '../../components/Journal/JournalCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

export default function Journal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');

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
      await apiClient.post('/journals', entry);
      await fetchJournals();
      showSuccess('Journal entry created successfully!');
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to create journal entry.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/journals/${id}`);
      setJournals(prev => prev.filter(j => (j._id || j.id) !== id));
      showSuccess('Journal entry deleted.');
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
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>My Journal</h1>
                <p className="text-muted-foreground mt-2">
                  {journals.length} {journals.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <Button onClick={() => setModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" /> New Entry
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
                  {searchQuery || moodFilter !== 'all' ? 'No entries match your filters' : 'No journal entries yet'}
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
