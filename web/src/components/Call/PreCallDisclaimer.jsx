import { useState } from 'react';
import apiClient from '../../apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * Pre-call disclaimer + (for patients) sharing preferences form.
 * Props:
 *  - open: bool
 *  - onOpenChange: fn
 *  - appointmentId: string
 *  - role: 'patient' | 'therapist' | 'psychiatrist' | 'admin'
 *  - onAccept: fn invoked after prefs are saved (or immediately for therapist)
 */
export default function PreCallDisclaimer({ open, onOpenChange, appointmentId, role, onAccept }) {
  const isPatient = role === 'patient';
  const [prefs, setPrefs] = useState({
    share_mood: true,
    share_emotions: true,
    share_demographics: false,
    share_journal: false,
    share_assessments: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleAccept = async () => {
    setError('');
    if (!isPatient) {
      onAccept && onAccept();
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/sharing-preferences', {
        appointment_id: appointmentId,
        ...prefs,
      });
      onAccept && onAccept(prefs);
    } catch (e) {
      setError('Could not save sharing preferences. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const Checkbox = ({ k, label, description }) => (
    <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40 cursor-pointer">
      <input
        type="checkbox"
        className="mt-1"
        checked={!!prefs[k]}
        onChange={() => toggle(k)}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Montserrat' }}>
            {isPatient ? 'Before you join' : 'Confidentiality reminder'}
          </DialogTitle>
          <DialogDescription>
            {isPatient
              ? 'Choose what information to share with your therapist for this session.'
              : 'By joining this call, you agree to maintain patient confidentiality and follow clinical best practices.'}
          </DialogDescription>
        </DialogHeader>

        {isPatient && (
          <div className="space-y-2">
            <Checkbox k="share_mood" label="Share latest mood" description="Your most recent mood log" />
            <Checkbox k="share_emotions" label="Share recent emotions" description="Emotions detected from recent journals" />
            <Checkbox k="share_demographics" label="Share demographics" description="Age and gender" />
            <Checkbox k="share_journal" label="Share recent journal entries" description="Last 5 entries" />
            <Checkbox k="share_assessments" label="Share assessment results" description="Recent self-assessment results" />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange && onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={saving}>
            {saving ? 'Saving…' : 'I agree and continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
