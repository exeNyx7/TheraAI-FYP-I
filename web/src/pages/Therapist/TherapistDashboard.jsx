import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';
import {
  Users, Calendar, AlertCircle, Activity, Smile, Frown, Heart, Wind, Video,
  ChevronRight, Phone,
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

function fmtApptDate(appt) {
  const raw = appt.scheduled_at || appt.date;
  if (!raw) return 'Scheduled';
  try {
    return new Date(raw).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.get('/therapist/dashboard').then(r => r.data).catch(() => null),
      apiClient.get('/therapist/patients').then(r => r.data).catch(() => []),
      apiClient.get('/therapist/alerts').then(r => r.data).catch(() => []),
    ]).then(([d, p, a]) => {
      if (cancelled) return;
      const safePatients = Array.isArray(p) ? p : [];
      const normalized = normalizeDashboard(d);
      if (normalized.active_patients === 0 && safePatients.length > 0) normalized.active_patients = safePatients.length;
      if (normalized.total_patients === 0 && safePatients.length > 0) normalized.total_patients = safePatients.length;
      setDashboard(normalized);
      setPatients(safePatients);
      setAlerts(Array.isArray(a) ? a : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (!user) return null;

  const displayName = user.full_name || user.name || 'Doctor';
  const upcomingAppointments = dashboard.upcoming_appointments;

  const metrics = [
    { label: 'Total Patients',    value: dashboard.total_patients,                       icon: Users,        color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Active Patients',   value: dashboard.active_patients || patients.length,   icon: Activity,     color: 'text-green-500 bg-green-500/10' },
    { label: 'Sessions This Week', value: dashboard.sessions_this_week,                  icon: Calendar,     color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Pending Alerts',    value: dashboard.pending_alerts,                       icon: AlertCircle,  color: 'text-red-500 bg-red-500/10' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <VideoCallModal
          isOpen={showVideoCall}
          onClose={() => { setShowVideoCall(false); setActiveAppointment(null); setSelectedPatient(null); }}
          appointmentId={activeAppointment?.id || activeAppointment?.appointment_id || activeAppointment?._id}
          patientName={selectedPatient?.name || selectedPatient?.full_name || activeAppointment?.patient_name || 'Patient'}
          therapistName={`Dr. ${displayName}`}
        />

        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
              Welcome, Dr. {displayName}
            </h1>
            <p className="text-muted-foreground mt-1">Therapist Dashboard</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(m => {
              const Icon = m.icon;
              return (
                <Card key={m.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{m.label}</p>
                        <p className="text-3xl font-bold mt-1">{loading ? '—' : m.value}</p>
                      </div>
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${m.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main grid: patients list + upcoming sessions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Patient overview — 2/3 width */}
            <div className="xl:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" /> My Patients
                    </CardTitle>
                    <CardDescription>Current mood &amp; status at a glance</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/patients')}>
                    View all <ChevronRight className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
                  {!loading && patients.length === 0 && (
                    <p className="text-sm text-muted-foreground">No patients yet.</p>
                  )}
                  {!loading && patients.map(patient => {
                    const patientName = patient.name || patient.full_name || 'Unknown Patient';
                    const mood = patient.current_mood || patient.latest_mood || 'neutral';
                    const MoodIcon = moodIcons[mood] || Smile;
                    const isCritical = patient.status === 'critical' || Number(patient.unacknowledged_alerts ?? 0) > 0;
                    const patientId = patient.id || patient._id;
                    return (
                      <div
                        key={patientId || patient.email || patientName}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {(patientName || '?')[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{patientName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MoodIcon className="h-3 w-3" /> {mood}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-xs">
                            {patient.mood_trend || (isCritical ? 'attention' : 'stable')}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => navigate(`/patients/${patientId}`)}
                          >
                            View <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming sessions — 1/3 width, scrollable */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" /> Upcoming Sessions
                </CardTitle>
                <CardDescription>Your next appointments</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-80 space-y-3 pr-1">
                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loading && upcomingAppointments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
                )}
                {!loading && upcomingAppointments.map(appt => {
                  const apptId = appt.id || appt.appointment_id || appt._id;
                  return (
                    <div
                      key={apptId || `${appt.patient_name || 'patient'}-${appt.scheduled_at || ''}`}
                      className="p-3 border border-border rounded-lg space-y-2"
                    >
                      <p className="font-medium text-sm">{appt.patient_name || appt.patient || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground">{fmtApptDate(appt)}</p>
                      {apptId && (
                        <Button
                          size="sm"
                          className="w-full gap-1.5 h-8 text-xs"
                          onClick={() => navigate(`/waiting-room/${apptId}`)}
                        >
                          <Video className="h-3.5 w-3.5" /> Join Session
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Crisis Alerts — shown only if there are any */}
          {alerts.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600 text-base">
                  <AlertCircle className="h-4 w-4" /> Crisis Alerts
                </CardTitle>
                <CardDescription>Patients flagged by the AI crisis detection system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.map(alert => {
                  const alertId = alert.id || alert._id;
                  const patientId = alert.patient_id;
                  return (
                    <div
                      key={alertId || `${alert.patient_id || 'patient'}-${alert.created_at || ''}`}
                      className="flex items-start justify-between gap-4 p-4 border border-red-500/20 rounded-lg bg-background"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{alert.patient_name || 'Patient'}</p>
                          <Badge variant="destructive" className="text-xs">{alert.severity || 'high'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alert.message || alert.message_excerpt || alert.trigger || 'Alert requires attention.'}
                        </p>
                        {alert.created_at && (
                          <p className="text-xs text-muted-foreground mt-1">{alert.created_at?.slice(0, 16).replace('T', ' ')}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {patientId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => navigate(`/patients/${patientId}`)}
                          >
                            <ChevronRight className="h-3 w-3" /> View Patient
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => navigate('/appointments')}
                        >
                          <Phone className="h-3 w-3" /> Appointments
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
