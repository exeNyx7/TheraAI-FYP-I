import { useState, useEffect, useRef } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { Smile, Frown, Heart, Wind, Circle, Plus, Calendar, TrendingUp, Radar as RadarIcon, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { useMoods } from '../../hooks/useMoods';

const MOODS = [
  { value: 'happy', label: 'Happy', color: '#FBBF24', icon: Smile },
  { value: 'sad', label: 'Sad', color: '#3B82F6', icon: Frown },
  { value: 'anxious', label: 'Anxious', color: '#EF4444', icon: Heart },
  { value: 'calm', label: 'Calm', color: '#14B8A6', icon: Wind },
  { value: 'neutral', label: 'Neutral', color: '#9CA3AF', icon: Circle },
  { value: 'excited', label: 'Excited', color: '#F59E0B', icon: Smile },
  { value: 'stressed', label: 'Stressed', color: '#6366F1', icon: Heart },
];

export default function MoodTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { moods: moodEntries, logMood } = useMoods();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(false);
  const voiceRecognitionRef = useRef(null);

  const CRISIS_MOODS = ['sad', 'anxious', 'stressed', 'angry'];

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const startVoiceNotes = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onstart = () => setVoiceListening(true);
    r.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      setNotes(prev => prev ? `${prev} ${spoken}` : spoken);
    };
    r.onend = () => { setVoiceListening(false); voiceRecognitionRef.current = null; };
    r.onerror = () => { setVoiceListening(false); voiceRecognitionRef.current = null; };
    voiceRecognitionRef.current = r;
    r.start();
  };

  const stopVoiceNotes = () => {
    voiceRecognitionRef.current?.stop();
  };

  const handleAddMood = async () => {
    setIsSubmitting(true);
    try {
      await logMood({ mood: selectedMood, intensity, notes });
      showSuccess(`Mood logged: ${selectedMood}`);
      setModalOpen(false);
      setNotes('');
      setIntensity(3);
      // Check if last 3 entries are all crisis-level → show alert
      const last3 = moodEntries.slice(0, 3);
      if (last3.length >= 3 && last3.every(m => CRISIS_MOODS.includes(m.mood))) {
        setCrisisAlert(true);
      }
    } catch { showError('Failed to log mood.'); }
    finally { setIsSubmitting(false); }
  };

  // Derived stats
  const trendData = moodEntries.slice(-14).map(e => ({
    date: new Date(e.created_at || e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    intensity: e.intensity || 3,
  }));

  const moodCounts = moodEntries.reduce((acc, e) => { acc[e.mood] = (acc[e.mood] || 0) + 1; return acc; }, {});
  const radarData = MOODS.map(m => ({ mood: m.label, count: moodCounts[m.value] || 0 }));
  const avgIntensity = moodEntries.length ? (moodEntries.reduce((s, e) => s + (e.intensity || 3), 0) / moodEntries.length).toFixed(1) : '—';
  const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  if (!user) return null;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 lg:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Mood Tracking</h1>
                <p className="text-muted-foreground mt-1 text-sm">Track and analyze your emotional patterns</p>
              </div>
              <Button onClick={() => setModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 rounded-xl self-start sm:self-auto flex-shrink-0">
                <Plus className="h-4 w-4" /> Log Mood
              </Button>
            </div>

            {/* Crisis alert banner */}
            {crisisAlert && (
              <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">💛</span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">We're here for you</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We've noticed you've been logging difficult moods lately. Talking to a therapist could help.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-full text-xs h-8" onClick={() => navigate('/appointments')}>
                      Book a Therapist
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full text-xs h-8 text-muted-foreground" onClick={() => setCrisisAlert(false)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                  <CardContent className="px-2 sm:px-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData} margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={24} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }} />
                        <Line type="monotone" dataKey="intensity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><RadarIcon className="h-5 w-5" />Mood Distribution</CardTitle>
                    <CardDescription>Frequency across all mood types</CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="60%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="mood"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Radar
                          name="Moods"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--card-foreground))',
                          }}
                        />
                      </RadarChart>
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

      {/* Log Mood Modal — bottom-sheet on mobile, centered card on sm+ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[92dvh] overflow-y-auto shadow-2xl animate-fade-in space-y-5">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Montserrat' }}>Log Your Mood</h2>

            <div className="space-y-3">
              <label className="text-sm font-medium">How are you feeling?</label>
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {MOODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMood(m.value)}
                      className={`p-2 sm:p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        selectedMood === m.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: m.color }} />
                      <span className="text-[10px] sm:text-xs">{m.label}</span>
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Notes (optional)</label>
                {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                  <button
                    type="button"
                    onClick={voiceListening ? stopVoiceNotes : startVoiceNotes}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                      voiceListening
                        ? 'text-destructive bg-destructive/10 animate-pulse'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {voiceListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {voiceListening ? 'Stop' : 'Dictate'}
                  </button>
                )}
              </div>
              <textarea
                placeholder="What's contributing to this mood?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
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
