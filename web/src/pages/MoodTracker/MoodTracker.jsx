import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Smile, Frown, Heart, Wind, Circle, Plus, Calendar, TrendingUp, PieChartIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

const MOODS = [
  { value: 'happy', label: 'Happy', color: '#FBBF24', icon: Smile },
  { value: 'sad', label: 'Sad', color: '#3B82F6', icon: Frown },
  { value: 'anxious', label: 'Anxious', color: '#EF4444', icon: Heart },
  { value: 'calm', label: 'Calm', color: '#14B8A6', icon: Wind },
  { value: 'neutral', label: 'Neutral', color: '#9CA3AF', icon: Circle },
  { value: 'excited', label: 'Excited', color: '#F59E0B', icon: Smile },
  { value: 'stressed', label: 'Stressed', color: '#6366F1', icon: Heart },
];

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : 'http://localhost:8000/api/v1';

export default function MoodTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [moodEntries, setMoodEntries] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = () => localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchMoods();
  }, [user]);

  const fetchMoods = async () => {
    try {
      const res = await fetch(`${API}/moods`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setMoodEntries(Array.isArray(data) ? data : data.moods || []);
    } catch { }
  };

  const handleAddMood = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/moods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ mood: selectedMood, intensity, notes }),
      });
      if (!res.ok) throw new Error();
      await fetchMoods();
      showSuccess(`Mood logged: ${selectedMood}`);
      setModalOpen(false);
      setNotes('');
      setIntensity(3);
    } catch { showError('Failed to log mood.'); }
    finally { setIsSubmitting(false); }
  };

  // Derived stats
  const trendData = moodEntries.slice(-14).map(e => ({
    date: new Date(e.created_at || e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    intensity: e.intensity || 3,
  }));

  const moodCounts = moodEntries.reduce((acc, e) => { acc[e.mood] = (acc[e.mood] || 0) + 1; return acc; }, {});
  const pieData = MOODS.map(m => ({ name: m.label, value: moodCounts[m.value] || 0, color: m.color })).filter(m => m.value > 0);
  const avgIntensity = moodEntries.length ? (moodEntries.reduce((s, e) => s + (e.intensity || 3), 0) / moodEntries.length).toFixed(1) : '—';
  const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

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
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Mood Tracking</h1>
                <p className="text-muted-foreground mt-2">Track and analyze your emotional patterns</p>
              </div>
              <Button onClick={() => setModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Log Mood
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Total Tracked</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{moodEntries.length}</div><p className="text-xs text-muted-foreground mt-1">entries</p></CardContent>
              </Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Most Common</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold capitalize">{mostCommon}</div><p className="text-xs text-muted-foreground mt-1">mood across time</p></CardContent>
              </Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Avg. Intensity</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{avgIntensity}</div><p className="text-xs text-muted-foreground mt-1">out of 5</p></CardContent>
              </Card>
            </div>

            {/* Charts */}
            {trendData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Mood Trend</CardTitle>
                    <CardDescription>Last 14 days intensity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="intensity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" />Mood Distribution</CardTitle>
                    <CardDescription>Breakdown by mood</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}`}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent entries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {moodEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No mood entries yet. Click "Log Mood" to get started!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {moodEntries.slice(0, 5).map((entry, idx) => {
                      const moodDef = MOODS.find(m => m.value === entry.mood) || MOODS[4];
                      const Icon = moodDef.icon;
                      return (
                        <div key={entry._id || idx} className="flex items-start justify-between p-4 border border-border rounded-lg hover:shadow-md transition-all">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold capitalize">{entry.mood}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(entry.created_at || entry.date).toLocaleDateString()}
                              </p>
                              {entry.notes && <p className="text-sm mt-1 text-foreground/80">{entry.notes}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{entry.intensity || '—'}/5</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Log Mood Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Montserrat' }}>Log Your Mood</h2>

            <div className="space-y-3">
              <label className="text-sm font-medium">How are you feeling?</label>
              <div className="grid grid-cols-4 gap-2">
                {MOODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMood(m.value)}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        selectedMood === m.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" style={{ color: m.color }} />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Intensity: {intensity}/5</label>
              <input
                type="range" min="1" max="5" value={intensity}
                onChange={e => setIntensity(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span><span>High</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                placeholder="What's contributing to this mood?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1 bg-transparent">Cancel</Button>
              <Button onClick={handleAddMood} disabled={isSubmitting} className="flex-1 bg-primary hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Mood'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
