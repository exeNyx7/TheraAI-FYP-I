import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import SessionNoteEditor from '../../components/Therapist/SessionNoteEditor';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';

export default function PostCallTherapist() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get(`/appointments/${appointmentId}`).catch(() => ({ data: null })),
      apiClient.get(`/appointments/${appointmentId}/patient-summary`).catch(() => ({ data: null })),
    ]).then(([a, s]) => {
      if (cancelled) return;
      setAppt(a?.data || null);
      setSummary(s?.data || null);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appointmentId]);

  const shared = summary?.shared || {};

  return (
    <div className="flex min-h-screen bg-background">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Post-Session Review</h1>
            <p className="text-muted-foreground">Patient-shared data and session notes.</p>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && summary && (
            <div className="grid md:grid-cols-2 gap-4">
              {shared.mood && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Latest Mood</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.mood ? (
                      <div className="text-sm">
                        <p><strong>{summary.mood.mood || '—'}</strong> {summary.mood.score !== undefined && `(${summary.mood.score})`}</p>
                        {summary.mood.note && <p className="text-muted-foreground mt-1">{summary.mood.note}</p>}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No mood data.</p>}
                  </CardContent>
                </Card>
              )}

              {shared.emotions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Emotions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.emotions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {summary.emotions.map((e, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded bg-primary/10">
                            {typeof e === 'string' ? e : JSON.stringify(e)}
                          </span>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No data.</p>}
                  </CardContent>
                </Card>
              )}

              {shared.demographics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Demographics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.demographics ? (
                      <div className="text-sm space-y-1">
                        <p>Name: {summary.demographics.full_name || '—'}</p>
                        <p>Age: {summary.demographics.age || '—'}</p>
                        <p>Gender: {summary.demographics.gender || '—'}</p>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No data.</p>}
                  </CardContent>
                </Card>
              )}

              {shared.journal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Journal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.journal?.length ? summary.journal.map((j) => (
                      <div key={j.id} className="text-sm border-b pb-2 last:border-0">
                        <p className="font-medium">{j.title || 'Untitled'}</p>
                        <p className="text-muted-foreground line-clamp-2">{j.content}</p>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No entries.</p>}
                  </CardContent>
                </Card>
              )}

              {shared.assessments && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assessments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.assessments?.length ? summary.assessments.map((a) => (
                      <div key={a.id} className="text-sm">
                        <p>{a.name}: <strong>{a.score}</strong></p>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No data.</p>}
                  </CardContent>
                </Card>
              )}

              {!shared.mood && !shared.emotions && !shared.demographics && !shared.journal && !shared.assessments && (
                <Card className="md:col-span-2">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      The patient did not share any data for this session.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {appt && (
            <SessionNoteEditor
              appointmentId={appointmentId}
              patientId={appt.patient_id}
            />
          )}

          <div className="flex justify-end">
            <Button onClick={() => navigate('/schedule')}>Done</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
