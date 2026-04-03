import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Avatar } from '../../components/ui/avatar';
import {
  Users, Calendar, Clock, AlertCircle, FileText, MessageSquare,
  TrendingUp, BarChart3, Search, Plus, CheckCircle,
} from 'lucide-react';
import apiClient from '../../apiClient';

export default function PsychiatristDashboardV0() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || !['psychiatrist', 'admin'].includes(user.role)) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, patientsRes, alertsRes, appointmentsRes] = await Promise.all([
        apiClient.get('/therapist/dashboard'),
        apiClient.get('/therapist/patients'),
        apiClient.get('/therapist/alerts'),
        apiClient.get('/appointments?status=scheduled'),
      ]);

      setStats({
        totalPatients: statsRes.data.total_patients ?? 0,
        appointmentsToday: statsRes.data.appointments_today ?? 0,
        pendingAlerts: statsRes.data.pending_alerts ?? 0,
        sessionsThisWeek: statsRes.data.sessions_this_week ?? 0,
      });

      setPatients(patientsRes.data || []);
      setAlerts(alertsRes.data || []);

      // Filter today's appointments from all scheduled
      const today = new Date().toDateString();
      const todayAppts = (appointmentsRes.data || []).filter((a) => {
        const apptDate = new Date(a.scheduled_at).toDateString();
        return apptDate === today;
      });
      setTodayAppointments(todayAppts);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await apiClient.post(`/therapist/alerts/${alertId}/acknowledge`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const getRiskBadgeVariant = (level) => {
    switch (level) {
      case 'high':
      case 'critical': return 'destructive';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString();
  };

  const filteredPatients = patients.filter((p) =>
    (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                  Psychiatrist Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Welcome back, Dr. {user.full_name || user.name}
                </p>
              </div>
              <Button onClick={fetchDashboardData} variant="outline" size="sm" disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>

            {/* Error state */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                    <p className="text-2xl font-bold mt-1">
                      {loading ? '—' : stats?.totalPatients ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Appointments Today</p>
                    <p className="text-2xl font-bold mt-1">
                      {loading ? '—' : stats?.appointmentsToday ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Alerts</p>
                    <p className="text-2xl font-bold mt-1 text-destructive">
                      {loading ? '—' : stats?.pendingAlerts ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions This Week</p>
                    <p className="text-2xl font-bold mt-1">
                      {loading ? '—' : stats?.sessionsThisWeek ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Appointments */}
              <Card className="lg:col-span-2">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Today's Appointments</h3>
                    <Button variant="outline" size="sm" onClick={() => navigate('/appointments')}>
                      <Plus className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : todayAppointments.length > 0 ? (
                    todayAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <Avatar>
                          {(appt.patient_name || 'P').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{appt.patient_name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground capitalize">{appt.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatTime(appt.scheduled_at)}</p>
                          <p className="text-sm text-muted-foreground">{appt.duration_minutes} min</p>
                        </div>
                        <Badge variant="success">{appt.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No appointments scheduled for today</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Crisis Alerts */}
              <Card>
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <h3 className="text-xl font-semibold">Crisis Alerts</h3>
                    {alerts.length > 0 && (
                      <Badge variant="destructive" className="ml-auto">{alerts.length}</Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {loading ? (
                    <div className="h-12 rounded-lg bg-muted animate-pulse" />
                  ) : alerts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-60" />
                      <p className="text-sm">No pending alerts</p>
                    </div>
                  ) : (
                    alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{alert.patient_name}</p>
                          <Badge variant={getRiskBadgeVariant(alert.severity)} className="text-xs">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.trigger}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(alert.created_at)}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs mt-1"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-semibold">Quick Actions</h3>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" className="justify-start" onClick={() => navigate('/appointments')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/chat')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/assessments')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Assessments
                </Button>
                <Button variant="outline" className="justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </Card>

            {/* Patient List */}
            <Card>
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">My Patients</h3>
                  <p className="text-sm text-muted-foreground">{patients.length} total</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{searchQuery ? 'No patients match your search' : 'No patients yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/therapist/patients/${patient.id}`)}
                      >
                        <Avatar>
                          {(patient.full_name || 'P').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{patient.full_name}</p>
                            {patient.unacknowledged_alerts > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {patient.unacknowledged_alerts} alert{patient.unacknowledged_alerts > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Last mood: {patient.latest_mood || 'N/A'} ·{' '}
                            Last session: {formatDate(patient.last_appointment)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {patient.last_appointment_status || '—'}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
