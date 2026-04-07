import { useEffect, useState } from 'react';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Calendar, Clock, Plus, Video } from 'lucide-react';
import apiClient from '../../apiClient';
import { useNavigate } from 'react-router-dom';

export default function Schedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/therapist/dashboard')
      .then(r => {
        if (cancelled) return;
        const appts = r.data?.upcoming_appointments;
        setAppointments(Array.isArray(appts) ? appts : []);
      })
      .catch(() => { if (!cancelled) setAppointments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
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
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
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
                    <div key={s.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{s.patient_name}</p>
                          <p className="text-sm text-muted-foreground">{s.date}{s.time ? ` · ${s.time}` : ''}</p>
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
