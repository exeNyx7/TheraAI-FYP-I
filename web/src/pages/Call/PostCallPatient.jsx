import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Star, CheckCircle, Loader2 } from 'lucide-react';

const SHARING_ITEMS = [
  { k: 'share_mood',         label: 'Latest mood',            desc: 'Your most recent mood log' },
  { k: 'share_emotions',     label: 'Recent emotions',        desc: 'Emotion themes from your journal' },
  { k: 'share_demographics', label: 'Demographics',           desc: 'Your name, age, and gender' },
  { k: 'share_journal',      label: 'Recent journal entries', desc: 'Up to 3 most recent entries' },
  { k: 'share_assessments',  label: 'Assessment results',     desc: 'PHQ-9, GAD-7, etc.' },
];

export default function PostCallPatient() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.get(`/sharing-preferences/${appointmentId}`)
      .then(r => { if (!cancelled) setPrefs(r.data || {}); })
      .catch(() => { if (!cancelled) setPrefs({}); });
    return () => { cancelled = true; };
  }, [appointmentId]);

  const togglePref = (key) => setPrefs(p => ({ ...p, [key]: !p?.[key] }));

  const handleDone = async () => {
    setSaving(true);
    try {
      // Always persist sharing prefs on Done so the patient doesn't have to
      // click "Update sharing" separately before leaving.
      if (prefs !== null) {
        await apiClient.post('/sharing-preferences', {
          appointment_id: appointmentId,
          share_mood:         !!prefs?.share_mood,
          share_emotions:     !!prefs?.share_emotions,
          share_demographics: !!prefs?.share_demographics,
          share_journal:      !!prefs?.share_journal,
          share_assessments:  !!prefs?.share_assessments,
        });
      }
      if (rating > 0) {
        await apiClient.post(`/appointments/${appointmentId}/feedback`, {
          rating,
          comment: comment || undefined,
        });
      }
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch {
      // best-effort — navigate anyway
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <p className="text-lg font-semibold">All saved! Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>How was your session?</h1>
          <p className="text-muted-foreground mt-1">Your feedback is private and helps us improve care.</p>
        </div>

        {/* Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Rate your experience</CardTitle>
            <CardDescription>Optional — your therapist won't see individual star ratings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(r => r === n ? 0 : n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`h-8 w-8 transition-colors ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <Textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Anything you'd like to share about the session? (optional)"
              />
            )}
          </CardContent>
        </Card>

        {/* Sharing prefs */}
        <Card>
          <CardHeader>
            <CardTitle>What your therapist can see</CardTitle>
            <CardDescription>
              Control which parts of your profile are visible to your therapist for this appointment.
              These preferences are saved when you click Done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {prefs === null ? (
              <p className="text-sm text-muted-foreground py-3">Loading preferences…</p>
            ) : (
              SHARING_ITEMS.map(it => (
                <label
                  key={it.k}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!prefs?.[it.k]}
                    onChange={() => togglePref(it.k)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium leading-tight">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                </label>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard')} disabled={saving}>
            Skip
          </Button>
          <Button onClick={handleDone} disabled={saving || prefs === null} className="min-w-[120px] gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Done'}
          </Button>
        </div>
      </div>
    </div>
  );
}
