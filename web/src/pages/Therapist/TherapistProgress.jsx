import { useState, useEffect } from 'react';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, Calendar, FileText, TrendingUp, Activity, Loader2 } from 'lucide-react';
import apiClient from '../../apiClient';

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold ${color}`} style={{ fontFamily: 'Montserrat' }}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

export default function TherapistProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [dashRes, patientsRes, notesRes] = await Promise.allSettled([
          apiClient.get('/therapist/dashboard'),
          apiClient.get('/therapist/patients'),
          apiClient.get('/session-notes'),
        ]);

        const dash = dashRes.status === 'fulfilled' ? dashRes.value.data : {};
        const patients = patientsRes.status === 'fulfilled'
          ? (Array.isArray(patientsRes.value.data) ? patientsRes.value.data : patientsRes.value.data?.patients || [])
          : [];
        const notes = notesRes.status === 'fulfilled'
          ? (Array.isArray(notesRes.value.data) ? notesRes.value.data : notesRes.value.data?.notes || [])
          : [];

        if (!cancelled) {
          setData({
            totalPatients: patients.length || dash.total_patients || 0,
            totalSessions: dash.total_sessions || dash.completed_appointments || 0,
            sessionNotes: notes.length,
            alerts: dash.crisis_alerts || dash.alerts?.length || 0,
            upcomingToday: dash.upcoming_today || 0,
            completionRate: dash.completion_rate || null,
          });
        }
      } catch {
        if (!cancelled) setData({ totalPatients: 0, totalSessions: 0, sessionNotes: 0, alerts: 0, upcomingToday: 0, completionRate: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">

            <div className="space-y-1">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                My Progress
              </h1>
              <p className="text-muted-foreground">Your clinical activity and patient engagement overview</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard icon={Users}     label="Active Patients"  value={data.totalPatients} sub="Under your care"         color="text-primary"     bg="bg-primary/10" />
                  <StatCard icon={Calendar}  label="Sessions Done"    value={data.totalSessions} sub="All time"                color="text-green-600"   bg="bg-green-500/10" />
                  <StatCard icon={FileText}  label="Session Notes"    value={data.sessionNotes}  sub="Written by you"          color="text-blue-600"    bg="bg-blue-500/10" />
                  <StatCard icon={Activity}  label="Today's Sessions" value={data.upcomingToday} sub="Scheduled for today"     color="text-orange-500"  bg="bg-orange-500/10" />
                  <StatCard icon={TrendingUp} label="Crisis Alerts"   value={data.alerts}        sub="Requiring attention"     color="text-red-500"     bg="bg-red-500/10" />
                  {data.completionRate != null && (
                    <StatCard icon={TrendingUp} label="Completion Rate" value={`${data.completionRate}%`} sub="Sessions completed" color="text-purple-600" bg="bg-purple-500/10" />
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quick Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• Write session notes promptly after each appointment to track patient progress accurately.</p>
                    <p>• Review crisis alerts daily — patients with persistent low moods are automatically flagged.</p>
                    <p>• Use treatment plans to document long-term goals and share them with your patients.</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
