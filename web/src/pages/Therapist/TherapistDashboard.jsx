import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';
import {
  Users, Calendar, AlertCircle, Activity, Smile, Frown, Heart, Wind,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import apiClient from '../../apiClient';

const moodIcons = { happy: Smile, sad: Frown, anxious: Heart, calm: Wind };
const defaultDashboard = {
  total_patients: 0,
  active_patients: 0,
  sessions_this_week: 0,
  pending_alerts: 0,
  upcoming_appointments: [],
};

function normalizeDashboard(data) {
  const safe = data && typeof data === 'object' ? data : {};
  return {
    ...defaultDashboard,
    ...safe,
    upcoming_appointments: Array.isArray(safe.upcoming_appointments) ? safe.upcoming_appointments : [],
  };
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [escalations, setEscalations] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.get('/therapist/dashboard').then(r => r.data).catch(() => null),
      apiClient.get('/therapist/patients').then(r => r.data).catch(() => []),
      apiClient.get('/therapist/alerts').then(r => r.data).catch(() => []),
      apiClient.get('/escalations').then(r => r.data).catch(() => []),
    ]).then(([d, p, a, e]) => {
      if (cancelled) return;
      const safePatients = Array.isArray(p) ? p : [];
      const normalized = normalizeDashboard(d);

      if (normalized.active_patients === 0 && safePatients.length > 0) {
        normalized.active_patients = safePatients.length;
      }
      if (normalized.total_patients === 0 && safePatients.length > 0) {
        normalized.total_patients = safePatients.length;
      }

      setDashboard(normalized);
      setPatients(safePatients);
      setAlerts(Array.isArray(a) ? a : []);
      setEscalations(Array.isArray(e) ? e : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const acknowledgeEscalation = async (id) => {
    try {
      await apiClient.patch(`/escalations/${id}/acknowledge`);
      setEscalations(prev => prev.map(x => x.id === id ? { ...x, acknowledged: true, status: 'acknowledged' } : x));
    } catch (_) {}
  };

  if (!user) return null;

  const displayName = user.full_name || user.name || 'Doctor';
  const criticalPatients = patients.filter((p) => {
    const unacknowledgedAlerts = Number(p?.unacknowledged_alerts ?? 0);
    return p?.status === 'critical' || p?.mood_trend === 'declining' || unacknowledgedAlerts > 0;
  });
  const upcomingAppointments = Array.isArray(dashboard.upcoming_appointments)
    ? dashboard.upcoming_appointments
    : [];

  const metrics = [
    { label: 'Total Patients', value: dashboard.total_patients, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Active Patients', value: dashboard.active_patients || patients.length, icon: Activity, color: 'text-green-500 bg-green-500/10' },
    { label: 'Sessions This Week', value: dashboard.sessions_this_week, icon: Calendar, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Pending Alerts', value: dashboard.pending_alerts, icon: AlertCircle, color: 'text-red-500 bg-red-500/10' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div>
          <VideoCallModal
            isOpen={showVideoCall}
            onClose={() => setShowVideoCall(false)}
            patientName={selectedPatient?.name || selectedPatient?.full_name || 'Patient'}
            therapistName={`Dr. ${displayName}`}
          />

          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            <div>
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
                style={{ fontFamily: 'Montserrat' }}
              >
                Welcome, Dr. {displayName}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">Therapist Dashboard — Patient Management Center</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.label} className="hover:-translate-y-1 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{metric.label}</p>
                          <p className="text-3xl font-bold mt-1">{loading ? '—' : metric.value}</p>
                        </div>
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${metric.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Patient Health Overview
                    </CardTitle>
                    <CardDescription>Real-time patient status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
                    {!loading && patients.length === 0 && (
                      <p className="text-sm text-muted-foreground">No patients yet.</p>
                    )}
                    {!loading && patients.map((patient) => {
                      const patientName = patient.name || patient.full_name || 'Unknown Patient';
                      const mood = patient.current_mood || patient.latest_mood || 'neutral';
                      const MoodIcon = moodIcons[mood] || Smile;
                      const isCritical = patient.status === 'critical' || Number(patient.unacknowledged_alerts ?? 0) > 0;
                      return (
                        <div key={patient.id || patient._id || patient.email || patientName} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-all">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-primary font-bold">
                              {(patientName || '?')[0]}
                            </div>
                            <div>
                              <p className="font-semibold">{patientName}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <MoodIcon className="h-3.5 w-3.5" /> {mood}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={isCritical ? 'destructive' : 'secondary'}>
                              {patient.mood_trend || (isCritical ? 'attention' : 'stable')}
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => { setSelectedPatient(patient); setShowVideoCall(true); }}
                            >
                              Call
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                  {!loading && upcomingAppointments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
                  )}
                  {!loading && upcomingAppointments.map((appt) => (
                    <div key={appt.id || appt._id || `${appt.patient_name || 'patient'}-${appt.date || appt.scheduled_at || ''}`} className="p-3 border border-border rounded-lg">
                      <p className="font-medium text-sm">{appt.patient_name || appt.patient || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground">
                        {appt.date || appt.scheduled_at || 'Scheduled'} {appt.time && `at ${appt.time}`}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {alerts.length > 0 && (
              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Active Alerts
                  </CardTitle>
                  <CardDescription>Patients flagged for attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id || alert._id || `${alert.patient_id || 'patient'}-${alert.created_at || ''}`}
                        className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-background"
                      >
                        <div>
                          <p className="font-semibold">{alert.patient_name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground">{alert.message || alert.message_excerpt || alert.trigger || 'Alert requires attention.'}</p>
                        </div>
                        <Badge variant="destructive">{alert.severity || 'medium'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {escalations.length > 0 && (
              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Crisis Escalations
                  </CardTitle>
                  <CardDescription>Escalations detected from chat or manual triggers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {escalations.map((e) => (
                      <div
                        key={e.id || e._id || `${e.patient_id || 'patient'}-${e.created_at || ''}`}
                        className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-background"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{e.patient_name || 'Patient'}</p>
                            <Badge variant="destructive">{e.severity}</Badge>
                            {e.acknowledged && <Badge variant="secondary">Acknowledged</Badge>}
                            {e.free_session_granted && <Badge variant="secondary">Free session</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{e.message || e.triggered_by}</p>
                          <p className="text-xs text-muted-foreground">{e.created_at}</p>
                        </div>
                        {!e.acknowledged && (
                          <Button size="sm" variant="outline" onClick={() => acknowledgeEscalation(e.id)}>
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {criticalPatients.length > 0 && (
              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Critical Cases Requiring Attention
                  </CardTitle>
                  <CardDescription>Patients showing declining mood trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {criticalPatients.map((patient) => {
                      const patientName = patient.name || patient.full_name || 'Unknown Patient';
                      const mood = patient.current_mood || patient.latest_mood || 'neutral';
                      const MoodIcon = moodIcons[mood] || Smile;
                      return (
                        <div
                          key={patient.id || patient._id || patient.email || patientName}
                          className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-background hover:bg-background/80 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                              <MoodIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{patientName}</p>
                              <p className="text-sm text-muted-foreground">Status: {mood}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-red-600">Mood Declining</p>
                            <p className="text-xs text-muted-foreground">Last: {patient.last_appointment || '—'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
