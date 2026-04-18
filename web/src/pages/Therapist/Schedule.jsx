import { useEffect, useState } from 'react';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Calendar, Clock, Plus, Video } from 'lucide-react';
import apiClient from '../../apiClient';
import { useNavigate } from 'react-router-dom';

function toDateTimeParts(value) {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: '' };
  return {
    date: parsed.toLocaleDateString(),
    time: parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function Schedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const [dashboardRes, appointmentsRes] = await Promise.all([
          apiClient.get('/therapist/dashboard').catch(() => ({ data: null })),
          apiClient.get('/appointments', { params: { status: 'scheduled' } }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;

        const fromDashboard = Array.isArray(dashboardRes.data?.upcoming_appointments)
          ? dashboardRes.data.upcoming_appointments
          : [];

        if (fromDashboard.length > 0) {
          setAppointments(fromDashboard);
          return;
        }

        const fromAppointments = Array.isArray(appointmentsRes.data)
          ? appointmentsRes.data.map((a) => {
              const dt = toDateTimeParts(a.scheduled_at);
              return {
                ...a,
                date: a.date || dt.date,
                time: a.time || dt.time,
              };
            })
          : [];

        setAppointments(fromAppointments);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSchedule();
    return () => { cancelled = true; };
  }, []);

  // Group appointments by date.
  const grouped = appointments.reduce((acc, a) => {
    const key = a.date || 'Unscheduled';
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort();

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
                Schedule
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">Manage your availability and upcoming sessions</p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                <Calendar className="h-5 w-5" /> Upcoming Sessions
              </CardTitle>
              <CardDescription>
                Your upcoming appointments grouped by date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && <p className="text-sm text-muted-foreground">Loading schedule…</p>}
              {!loading && groupKeys.length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
              )}
              {!loading && groupKeys.map((date) => (
                <div key={date} className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{date}</p>
                  {grouped[date].map((s) => (
                    <div key={s.id || s._id || `${s.patient_name || 'patient'}-${s.date || s.scheduled_at || ''}`} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{s.patient_name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground">{s.date || 'Scheduled'}{s.time ? ` · ${s.time}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.status === 'confirmed' ? 'secondary' : 'outline'}>{s.status || 'scheduled'}</Badge>
                        {s.id && (
                          <Button size="sm" variant="secondary" className="gap-1" onClick={() => navigate(`/waiting-room/${s.id}`)}>
                            <Video className="h-4 w-4" /> Join
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
