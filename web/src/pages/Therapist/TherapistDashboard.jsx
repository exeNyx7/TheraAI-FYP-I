import { useState, useEffect } from 'react';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';
import {
  Users, Calendar, AlertCircle, Activity, Smile, Frown, Heart, Wind,
  TrendingUp, MessageSquare, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const moodIcons = { happy: Smile, sad: Frown, anxious: Heart, calm: Wind };

const mockPatients = [
  { id: '1', name: 'Sarah Johnson', currentMood: 'anxious', lastAppointment: 'Mar 25', status: 'critical', moodTrend: 'declining' },
  { id: '2', name: 'Michael Chen', currentMood: 'happy', lastAppointment: 'Mar 26', status: 'active', moodTrend: 'improving' },
  { id: '3', name: 'Emma Wilson', currentMood: 'sad', lastAppointment: 'Mar 24', status: 'active', moodTrend: 'stable' },
];

const mockUpcoming = [
  { id: '1', patientName: 'Sarah Johnson', date: 'Apr 1', time: '10:00 AM' },
  { id: '2', patientName: 'Michael Chen', date: 'Apr 2', time: '2:00 PM' },
  { id: '3', patientName: 'Emma Wilson', date: 'Apr 3', time: '11:00 AM' },
];

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const allowedRoles = ['psychiatrist', 'therapist', 'admin'];
    if (!allowedRoles.includes(user.role || user.user_type)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user) return null;

  const criticalPatients = mockPatients.filter(p => p.status === 'critical');
  const displayName = user.full_name || user.name || 'Doctor';

  return (
    <div className="flex">
      <TherapistSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <VideoCallModal
            isOpen={showVideoCall}
            onClose={() => setShowVideoCall(false)}
            patientName={selectedPatient?.name || 'Patient'}
            therapistName={`Dr. ${displayName}`}
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

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Patients', value: mockPatients.length, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
                { label: 'Active Patients', value: mockPatients.filter(p => p.status === 'active').length, icon: Activity, color: 'text-green-500 bg-green-500/10' },
                { label: 'Sessions This Week', value: 12, icon: Calendar, color: 'text-purple-500 bg-purple-500/10' },
                { label: 'Pending Alerts', value: criticalPatients.length, icon: AlertCircle, color: 'text-red-500 bg-red-500/10' },
              ].map((metric) => {
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

            {/* Active Alerts + Upcoming Sessions */}
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
                    {mockPatients.map((patient) => {
                      const MoodIcon = moodIcons[patient.currentMood] || Smile;
                      return (
                        <div key={patient.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-all">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-primary font-bold">
                              {patient.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold">{patient.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <MoodIcon className="h-3.5 w-3.5" /> {patient.currentMood}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={patient.status === 'critical' ? 'destructive' : 'secondary'}>
                              {patient.moodTrend}
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

              {/* Upcoming appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockUpcoming.map((appt) => (
                    <div key={appt.id} className="p-3 border border-border rounded-lg">
                      <p className="font-medium text-sm">{appt.patientName}</p>
                      <p className="text-xs text-muted-foreground">{appt.date} at {appt.time}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Critical Cases */}
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
                      const MoodIcon = moodIcons[patient.currentMood] || Smile;
                      return (
                        <div
                          key={patient.id}
                          className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-background hover:bg-background/80 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                              <MoodIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{patient.name}</p>
                              <p className="text-sm text-muted-foreground">Status: {patient.currentMood}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-red-600">Mood Declining</p>
                            <p className="text-xs text-muted-foreground">Last: {patient.lastAppointment}</p>
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
