import { useEffect, useState } from 'react';
import apiClient from '../../apiClient';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  patient_id: '',
  title: '',
  goals: '',
  interventions: '',
  status: 'active',
};

function linesToArray(text) {
  if (!text) return [];
  return text
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  if (!arr || !arr.length) return '';
  return arr.join('\n');
}

export default function TreatmentPlans() {
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansRes, patientsRes] = await Promise.all([
        apiClient.get('/treatment-plans'),
        apiClient.get('/therapist/patients'),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch (e) {
      setError('Failed to load treatment plans.');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const patientName = (id) => {
    const p = patients.find((x) => x.id === id);
    return p ? p.name : 'Unknown patient';
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      patient_id: plan.patient_id || '',
      title: plan.title || '',
      goals: arrayToLines(plan.goals),
      interventions: arrayToLines(plan.interventions),
      status: plan.status || 'active',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.patient_id || !form.title.trim()) {
      setError('Patient and title are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        patient_id: form.patient_id,
        title: form.title.trim(),
        goals: linesToArray(form.goals),
        interventions: linesToArray(form.interventions),
        status: form.status || 'active',
      };
      if (editingId) {
        await apiClient.put(`/treatment-plans/${editingId}`, payload);
      } else {
        await apiClient.post('/treatment-plans', payload);
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadData();
    } catch (e) {
      setError('Failed to save treatment plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this treatment plan?')) return;
    try {
      await apiClient.delete(`/treatment-plans/${id}`);
      await loadData();
    } catch (e) {
      setError('Failed to delete treatment plan.');
    }
  };

  const statusVariant = (status) => {
    if (status === 'active') return 'secondary';
    if (status === 'completed') return 'default';
    if (status === 'on-hold' || status === 'needs-review') return 'destructive';
    return 'outline';
  };

  return (
    <div className="flex min-h-screen bg-background">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: 'Montserrat' }}
              >
                Treatment Plans
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Evidence-based care plans across your caseload
              </p>
            </div>
            <Button className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" /> New Plan
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                <ClipboardList className="h-5 w-5" /> Active Plans
              </CardTitle>
              <CardDescription>
                Track progression, goals, and interventions for each patient's treatment plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No treatment plans yet. Click "New Plan" to create one.
                </p>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-all gap-4 flex-wrap"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{plan.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {patientName(plan.patient_id)}
                        {plan.goals?.length ? ` · ${plan.goals.length} goals` : ''}
                        {plan.interventions?.length ? ` · ${plan.interventions.length} interventions` : ''}
                      </p>
                    </div>
                    <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Montserrat' }}>
              {editingId ? 'Edit Treatment Plan' : 'New Treatment Plan'}
            </DialogTitle>
            <DialogDescription>
              Define goals and interventions tailored to this patient.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                disabled={!!editingId}
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. CBT for Generalized Anxiety"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Goals (one per line)</label>
              <Textarea
                rows={4}
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
                placeholder={'Reduce daily worry\nImprove sleep hygiene'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Interventions (one per line)</label>
              <Textarea
                rows={4}
                value={form.interventions}
                onChange={(e) => setForm({ ...form, interventions: e.target.value })}
                placeholder={'Weekly CBT sessions\nBreathing exercises'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="on-hold">On hold</option>
                <option value="needs-review">Needs review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
