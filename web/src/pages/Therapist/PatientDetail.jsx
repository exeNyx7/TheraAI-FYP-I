import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../apiClient';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import SessionNoteEditor from '../../components/Therapist/SessionNoteEditor';
import { ArrowLeft, User, Calendar, Pill, Dumbbell, FileText, ClipboardList, ChevronDown, ChevronRight, Plus } from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'notes', label: 'Notes' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'treatment', label: 'Treatment Plan' },
];

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

function Empty({ children }) {
  return (
    <div className="p-6 border border-dashed border-border rounded-lg text-center text-muted-foreground">
      {children}
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNoteAppt, setNewNoteAppt] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, hRes, nRes, tRes] = await Promise.all([
        apiClient.get(`/therapist/patients/${id}`).catch(() => ({ data: null })),
        apiClient.get(`/therapist/patients/${id}/history`).catch(() => ({ data: [] })),
        apiClient.get(`/session-notes`, { params: { patient_id: id } }).catch(() => ({ data: [] })),
        apiClient.get(`/treatment-plans`, { params: { patient_id: id } }).catch(() => ({ data: [] })),
      ]);

      const safeNotes = Array.isArray(nRes.data) ? nRes.data : [];
      const notesByAppointment = new Map();
      safeNotes.forEach((note) => {
        const apptId = note?.appointment_id;
        if (!apptId || notesByAppointment.has(apptId)) return;
        notesByAppointment.set(apptId, note);
      });

      const historyData = hRes.data || {};
      const historyAppointments = Array.isArray(historyData)
        ? historyData
        : (Array.isArray(historyData?.appointments) ? historyData.appointments : []);

      const normalizedHistory = historyAppointments.map((appt) => {
        const appointmentId = appt?.id || appt?.appointment_id;
        return {
          appointment_id: appointmentId,
          date: appt?.scheduled_at || appt?.date || null,
          status: appt?.status || 'completed',
          note: appointmentId ? notesByAppointment.get(appointmentId) || null : null,
        };
      });

      const profileSource = pRes.data || historyData?.patient || null;
      const normalizedProfile = profileSource
        ? {
            ...profileSource,
            name: profileSource.name || profileSource.full_name || 'Patient',
            joined_at: profileSource.joined_at || profileSource.created_at || null,
          }
        : null;

      setProfile(normalizedProfile);
      setHistory(normalizedHistory);
      setNotes(safeNotes);
      setPlans(Array.isArray(tRes.data) ? tRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aggregatedPrescriptions = useMemo(() => {
    const map = new Map();
    notes.forEach((n) => {
      (n.prescriptions || []).forEach((p) => {
        if (!p) return;
        const key = String(p).trim().toLowerCase();
        if (!map.has(key)) map.set(key, { text: String(p).trim(), last: n.created_at });
      });
    });
    return Array.from(map.values());
  }, [notes]);

  const aggregatedExercises = useMemo(() => {
    const map = new Map();
    notes.forEach((n) => {
      (n.exercises || []).forEach((e) => {
        if (!e) return;
        const key = String(e).trim().toLowerCase();
        if (!map.has(key)) map.set(key, { text: String(e).trim(), last: n.created_at });
      });
    });
    return Array.from(map.values());
  }, [notes]);

  const toggleExpand = (aid) => setExpanded((x) => ({ ...x, [aid]: !x[aid] }));

  const openNewNote = (apptId = '') => {
    setNewNoteAppt(apptId);
    setNewNoteOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Patients
          </Link>

          <div className="flex items-center gap-5 flex-wrap">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent truncate"
                style={{ fontFamily: 'Montserrat' }}
              >
                {profile?.name || (loading ? 'Loading…' : 'Patient')}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {[profile?.age ? `${profile.age} yrs` : null, profile?.gender, profile?.joined_at ? `Joined ${formatDate(profile.joined_at)}` : null]
                  .filter(Boolean)
                  .join(' • ') || 'Detailed patient record and care history'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {profile?.current_mood && (
                <Badge variant="secondary" className="capitalize">Mood: {profile.current_mood}</Badge>
              )}
              <Button size="sm" onClick={() => openNewNote('')}>
                <Plus className="h-4 w-4 mr-1" /> New note
              </Button>
            </div>
          </div>

          <div className="flex border-b border-border overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <Empty>Loading patient record…</Empty>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle style={{ fontFamily: 'Montserrat' }}>Profile</CardTitle>
                      <CardDescription>Basic demographics and care record.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Name</div>
                        <div className="font-medium">{profile?.name || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Email</div>
                        <div className="font-medium truncate">{profile?.email || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Age</div>
                        <div className="font-medium">{profile?.age ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Gender</div>
                        <div className="font-medium capitalize">{profile?.gender || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Joined</div>
                        <div className="font-medium">{formatDate(profile?.joined_at) || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Mood trend</div>
                        <div className="font-medium capitalize">{profile?.mood_trend || '—'}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle style={{ fontFamily: 'Montserrat' }}>Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total sessions</span>
                        <span className="font-semibold">{profile?.total_sessions ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Current mood</span>
                        <span className="font-semibold capitalize">{profile?.current_mood || '—'}</span>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="text-muted-foreground mb-1">Latest assessment</div>
                        {profile?.latest_assessment ? (
                          <div>
                            <div className="font-medium">{profile.latest_assessment.name || 'Assessment'}</div>
                            <div className="text-xs text-muted-foreground">
                              Score: {profile.latest_assessment.score ?? '—'} • {formatDate(profile.latest_assessment.created_at)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">None recorded</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'sessions' && (
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Montserrat' }}>Session history</CardTitle>
                    <CardDescription>Past appointments with this patient.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {history.length === 0 ? (
                      <Empty>No past sessions yet.</Empty>
                    ) : (
                      history.map((h, index) => {
                        const rowId = h.appointment_id || `history-${index}`;
                        const open = !!expanded[rowId];
                        return (
                          <div key={rowId} className="border border-border rounded-lg">
                            <button
                              onClick={() => toggleExpand(rowId)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{formatDate(h.date)}</span>
                                <Badge variant="outline" className="capitalize">{h.status}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {h.note ? 'Has note' : 'No note'}
                              </div>
                            </button>
                            {open && (
                              <div className="px-4 pb-4 pt-1 border-t border-border text-sm space-y-2">
                                {h.note ? (
                                  <>
                                    {h.note.subjective && (<div><span className="text-muted-foreground">S:</span> {h.note.subjective}</div>)}
                                    {h.note.objective && (<div><span className="text-muted-foreground">O:</span> {h.note.objective}</div>)}
                                    {h.note.assessment && (<div><span className="text-muted-foreground">A:</span> {h.note.assessment}</div>)}
                                    {h.note.plan && (<div><span className="text-muted-foreground">P:</span> {h.note.plan}</div>)}
                                    {h.note.conclusion && (<div><span className="text-muted-foreground">Conclusion:</span> {h.note.conclusion}</div>)}
                                  </>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">No session note recorded.</span>
                                    <Button size="sm" variant="outline" onClick={() => openNewNote(h.appointment_id || '')}>
                                      <Plus className="h-4 w-4 mr-1" /> Add note
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'notes' && (
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Montserrat' }}>Clinical notes</CardTitle>
                    <CardDescription>All SOAP notes for this patient.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notes.length === 0 ? (
                      <Empty>No clinical notes yet.</Empty>
                    ) : (
                      notes.map((n) => (
                        <div key={n.id} className="border border-border rounded-lg p-4 space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <FileText className="h-3 w-3" />
                            {formatDate(n.created_at)}
                          </div>
                          {n.subjective && (<div><span className="text-muted-foreground">S:</span> {n.subjective}</div>)}
                          {n.objective && (<div><span className="text-muted-foreground">O:</span> {n.objective}</div>)}
                          {n.assessment && (<div><span className="text-muted-foreground">A:</span> {n.assessment}</div>)}
                          {n.plan && (<div><span className="text-muted-foreground">P:</span> {n.plan}</div>)}
                          {n.conclusion && (<div><span className="text-muted-foreground">Conclusion:</span> {n.conclusion}</div>)}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'prescriptions' && (
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Montserrat' }}>Prescriptions</CardTitle>
                    <CardDescription>Aggregated across all session notes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aggregatedPrescriptions.length === 0 ? (
                      <Empty>No prescriptions recorded.</Empty>
                    ) : (
                      <ul className="space-y-2">
                        {aggregatedPrescriptions.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-3 border border-border rounded-lg p-3">
                            <Pill className="h-4 w-4 text-primary mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{p.text}</div>
                              {p.last && (
                                <div className="text-xs text-muted-foreground">Last noted {formatDate(p.last)}</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'exercises' && (
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Montserrat' }}>Exercises</CardTitle>
                    <CardDescription>Aggregated across all session notes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aggregatedExercises.length === 0 ? (
                      <Empty>No exercises assigned.</Empty>
                    ) : (
                      <ul className="space-y-2">
                        {aggregatedExercises.map((e, idx) => (
                          <li key={idx} className="flex items-start gap-3 border border-border rounded-lg p-3">
                            <Dumbbell className="h-4 w-4 text-primary mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{e.text}</div>
                              {e.last && (
                                <div className="text-xs text-muted-foreground">Last noted {formatDate(e.last)}</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'treatment' && (
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Montserrat' }}>Treatment plans</CardTitle>
                    <CardDescription>Active and historical treatment plans.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plans.length === 0 ? (
                      <Empty>No treatment plans yet.</Empty>
                    ) : (
                      plans.map((tp) => (
                        <div key={tp.id} className="border border-border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-primary" />
                              <span className="font-semibold">{tp.title || 'Treatment plan'}</span>
                            </div>
                            <Badge variant="outline" className="capitalize">{tp.status || 'active'}</Badge>
                          </div>
                          {tp.goals?.length > 0 && (
                            <div className="text-sm">
                              <div className="text-muted-foreground mb-1">Goals</div>
                              <ul className="list-disc ml-5 space-y-0.5">
                                {tp.goals.map((g, i) => (<li key={i}>{typeof g === 'string' ? g : g.description || JSON.stringify(g)}</li>))}
                              </ul>
                            </div>
                          )}
                          {tp.interventions?.length > 0 && (
                            <div className="text-sm">
                              <div className="text-muted-foreground mb-1">Interventions</div>
                              <ul className="list-disc ml-5 space-y-0.5">
                                {tp.interventions.map((g, i) => (<li key={i}>{typeof g === 'string' ? g : g.description || JSON.stringify(g)}</li>))}
                              </ul>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Created {formatDate(tp.created_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <Dialog open={newNoteOpen} onOpenChange={setNewNoteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>New session note</DialogTitle>
            <DialogDescription>
              {newNoteAppt ? 'Add a SOAP note for this appointment.' : 'Add a standalone SOAP note for this patient.'}
            </DialogDescription>
          </DialogHeader>
          <SessionNoteEditor
            appointmentId={newNoteAppt}
            patientId={id}
            onSaved={() => {
              setNewNoteOpen(false);
              loadAll();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
