import { useEffect, useState } from 'react';
import apiClient from '../../apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

/**
 * Reusable SOAP-format session note editor.
 * Props:
 *  - appointmentId: string
 *  - patientId: string
 *  - existingNote: optional note object (from GET /session-notes/:id) to edit
 *  - onSaved: callback(note) invoked after successful save
 */
function linesToArray(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  if (!arr || !arr.length) return '';
  return arr.join('\n');
}

const EMPTY = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  prescriptions: '',
  exercises: '',
  conclusion: '',
};

export default function SessionNoteEditor({ appointmentId, patientId, existingNote, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [noteId, setNoteId] = useState(existingNote?.id || null);

  useEffect(() => {
    if (existingNote) {
      setNoteId(existingNote.id || null);
      setForm({
        subjective: existingNote.subjective || '',
        objective: existingNote.objective || '',
        assessment: existingNote.assessment || '',
        plan: existingNote.plan || '',
        prescriptions: arrayToLines(existingNote.prescriptions),
        exercises: arrayToLines(existingNote.exercises),
        conclusion: existingNote.conclusion || '',
      });
    } else {
      setNoteId(null);
      setForm(EMPTY);
    }
  }, [existingNote]);

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        appointment_id: appointmentId,
        patient_id: patientId,
        subjective: form.subjective,
        objective: form.objective,
        assessment: form.assessment,
        plan: form.plan,
        prescriptions: linesToArray(form.prescriptions),
        exercises: linesToArray(form.exercises),
        conclusion: form.conclusion,
      };
      let res;
      if (noteId) {
        res = await apiClient.put(`/session-notes/${noteId}`, payload);
      } else {
        res = await apiClient.post('/session-notes', payload);
        if (res?.data?.id) setNoteId(res.data.id);
      }
      setSavedAt(new Date());
      if (onSaved) onSaved(res.data);
    } catch (e) {
      setError('Failed to save session note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontFamily: 'Montserrat' }}>Session Note (SOAP)</CardTitle>
        <CardDescription>
          Document subjective, objective, assessment, and plan details for this session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Subjective</label>
          <Textarea rows={3} value={form.subjective} onChange={setField('subjective')} placeholder="Patient's reported experience..." />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Objective</label>
          <Textarea rows={3} value={form.objective} onChange={setField('objective')} placeholder="Observable findings, affect, behavior..." />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Assessment</label>
          <Textarea rows={3} value={form.assessment} onChange={setField('assessment')} placeholder="Clinical impression, diagnosis..." />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Plan</label>
          <Textarea rows={3} value={form.plan} onChange={setField('plan')} placeholder="Next steps, follow-ups..." />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Prescriptions (one per line)</label>
          <Textarea rows={3} value={form.prescriptions} onChange={setField('prescriptions')} placeholder={'Sertraline 50mg daily\n...'} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Exercises (one per line)</label>
          <Textarea rows={3} value={form.exercises} onChange={setField('exercises')} placeholder={'4-7-8 breathing\nDaily gratitude journal'} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Conclusion</label>
          <Textarea rows={2} value={form.conclusion} onChange={setField('conclusion')} placeholder="Session wrap-up..." />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : noteId ? 'Editing existing note' : 'New note'}
          </span>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : noteId ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
