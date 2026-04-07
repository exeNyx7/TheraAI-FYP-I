import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';
import { PreSessionBriefingModal } from '../../components/Therapist/PreSessionBriefingModal';
import {
  Users, Calendar, AlertCircle, Activity, Smile, Frown, Heart, Wind, Loader2, FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import apiClient from '../../apiClient';

const moodIcons = { happy: Smile, sad: Frown, anxious: Heart, calm: Wind };

function getMoodIcon(label) {
  if (!label) return Smile;
  const lower = label.toLowerCase();
  if (lower.includes('happy') || lower.includes('positive')) return Smile;
  if (lower.includes('sad') || lower.includes('negative')) return Frown;
  if (lower.includes('anx')) return Heart;
  if (lower.includes('calm')) return Wind;
  return Smile;
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);

  const [briefingPatientId, setBriefingPatientId] = useState(null);
  const [briefingPatientName, setBriefingPatientName] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, patientsRes, upcomingRes, alertsRes] = await Promise.allSettled([
          apiClient.get('/therapist/dashboard'),
          apiClient.get('/therapist/patients'),
          apiClient.get('/appointments?status=scheduled'),
          apiClient.get('/therapist/alerts'),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (patientsRes.status === 'fulfilled') setPatients(patientsRes.value.data || []);
        if (upcomingRes.status === 'fulfilled') setUpcoming(upcomingRes.value.data || []);
        if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data || []);
      } catch (_) {
        // silently fail, show empty states
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, navigate]);

  const handleStartCall = (patient, appointmentId) => {
    setSelectedPatient(patient);
    setActiveAppointmentId(appointmentId || null);
    setShowVideoCall(true);
  };

  if (!user) return null;

  const displayName = user.full_name || user.name || 'Doctor';

  const metrics = [
    { label: 'Total Patients', value: stats?.total_patients ?? patients.length, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Active Patients', value: patients.length, icon: Activity, color: 'text-green-500 bg-green-500/10' },
    { label: 'Sessions This Week', value: stats?.sessions_this_week ?? 0, icon: Calendar, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Pending Alerts', value: alerts.length, icon: AlertCircle, color: 'text-red-500 bg-red-500/10' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      <main className="flex-1 overflow-auto">
        <div>
          <VideoCallModal
            isOpen={showVideoCall}
            onClose={() => { setShowVideoCall(false); setActiveAppointmentId(null); }}
            appointmentId={activeAppointmentId}
            patientName={selectedPatient?.full_name || selectedPatient?.name || 'Patient'}
            therapistName={`Dr. ${displayName}`}
          />
          <PreSessionBriefingModal
            isOpen={!!briefingPatientId}
            patientId={briefingPatientId}
            patientName={briefingPatientName}
            onClose={() => { setBriefingPatientId(null); setBriefingPatientName(''); }}
          />

          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div>
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
                style={{ fontFamily: 'Montserrat' }}
              >
                Welcome, Dr. {displayName}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">Therapist Dashboard — Patient Management Center</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin" /> Loading dashboard…
              </div>
            ) : (
              <>
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <Card key={metric.label} className="hover:-translate-y-1 transition-all duration-300 hover:shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">{metric.label}</p>
                              <p className="text-3xl font-bold mt-1">{metric.value}</p>
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

                {/* Patient Overview + Upcoming Sessions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Patient Health Overview */}
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
                        {patients.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-6">No patients yet.</p>
                        ) : (
                          patients.map((patient) => {
                            const MoodIcon = getMoodIcon(patient.latest_mood_label);
                            return (
                              <div
                                key={patient.patient_id}
                                className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-primary font-bold">
                                    {patient.full_name?.[0] || '?'}
                                  </div>
                                  <div>
                                    <p className="font-semibold">{patient.full_name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <MoodIcon className="h-3.5 w-3.5" />
                                      {patient.latest_mood_label || patient.latest_sentiment || 'No data'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {patient.latest_sentiment && (
                                    <Badge variant={
                                      patient.latest_sentiment?.toLowerCase().includes('negative') ? 'destructive' : 'secondary'
                                    }>
                                      {patient.latest_sentiment}
                                    </Badge>
                                  )}
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
                          })
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upcoming Sessions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Upcoming Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {upcoming.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">No upcoming sessions.</p>
                      ) : (
                        upcoming.map((appt) => {
                          const d = new Date(appt.scheduled_at);
                          const apptId = appt.id || appt._id;
                          return (
                            <div key={apptId} className="flex items-center justify-between p-3 border border-border rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{appt.patient_name || '—'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 bg-transparent text-xs h-8"
                                onClick={() => {
                                  setBriefingPatientId(appt.patient_id || null);
                                  setBriefingPatientName(appt.patient_name || 'Patient');
                                }}
                              >
                                <FileText className="h-3.5 w-3.5" /> Briefing
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Critical Cases Requiring Attention
                      </CardTitle>
                      <CardDescription>Patients with 3+ consecutive negative journal entries in the last 48 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {alerts.map((alert) => (
                          <div
                            key={alert.patient_id}
                            className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-background hover:bg-background/80 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <p className="font-semibold">{alert.full_name}</p>
                                <p className="text-sm text-muted-foreground">{alert.message}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600">Needs Attention</p>
                              <p className="text-xs text-muted-foreground">
                                {alert.latest_entry_at ? new Date(alert.latest_entry_at).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
