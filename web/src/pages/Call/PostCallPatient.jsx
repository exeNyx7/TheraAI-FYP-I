import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Star } from 'lucide-react';

export default function PostCallPatient() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.get(`/sharing-preferences/${appointmentId}`)
      .then((r) => { if (!cancelled) setPrefs(r.data || {}); })
      .catch(() => { if (!cancelled) setPrefs({}); });
    return () => { cancelled = true; };
  }, [appointmentId]);

  const togglePref = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p?.[key] }));
  };

  const updatePrefs = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      await apiClient.post('/sharing-preferences', {
        appointment_id: appointmentId,
        share_mood: !!prefs?.share_mood,
        share_emotions: !!prefs?.share_emotions,
        share_demographics: !!prefs?.share_demographics,
        share_journal: !!prefs?.share_journal,
        share_assessments: !!prefs?.share_assessments,
      });
      setSavedMsg('Updated.');
    } catch {
      setSavedMsg('Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    // Store feedback locally for now
    try {
      const key = `theraai_feedback_${appointmentId}`;
      localStorage.setItem(key, JSON.stringify({ rating, comment, at: new Date().toISOString() }));
    } catch {}
    navigate('/dashboard');
  };

  const items = [
    { k: 'share_mood', label: 'Latest mood' },
    { k: 'share_emotions', label: 'Recent emotions' },
    { k: 'share_demographics', label: 'Demographics' },
    { k: 'share_journal', label: 'Recent journal entries' },
    { k: 'share_assessments', label: 'Assessment results' },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>How was your session?</h1>
          <p className="text-muted-foreground">Your feedback helps us improve.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rate the session</CardTitle>
            <CardDescription>Optional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                >
                  <Star className={`h-8 w-8 ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything you'd like to share? (optional)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What was shared</CardTitle>
            <CardDescription>You can update your preferences for this appointment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((it) => (
              <label key={it.k} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prefs?.[it.k]}
                  onChange={() => togglePref(it.k)}
                />
                <span className="text-sm">{it.label}</span>
              </label>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">{savedMsg}</span>
              <Button size="sm" variant="secondary" onClick={updatePrefs} disabled={saving}>
                {saving ? 'Saving…' : 'Update sharing'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleDone}>Done</Button>
        </div>
      </div>
    </div>
  );
}
