import { useEffect, useState, useCallback } from 'react';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, RefreshCw, XCircle, Loader2, Link2, Link2Off } from 'lucide-react';
import { AppointmentCalendar } from '../../components/Calendar/AppointmentCalendar';
import apiClient from '../../apiClient';
import { useToast } from '../../contexts/ToastContext';

function GoogleCalendarCard({ onStatusChange }) {
  const { showSuccess, showError } = useToast();
  const [status, setStatus] = useState(null); // null | { connected, configured }
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/calendar/status');
      setStatus(res.data);
    } catch {
      setStatus({ connected: false, configured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Handle redirect back from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarConnected = params.get('calendar_connected');
    if (calendarConnected === 'true') {
      showSuccess('Google Calendar connected successfully!');
      fetchStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarConnected === 'false') {
      showError('Google Calendar connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus, showSuccess, showError]);

  const handleConnect = async () => {
    try {
      const res = await apiClient.get('/calendar/auth-url', { params: { redirect_page: 'schedule' } });
      if (res.data?.auth_url) window.location.href = res.data.auth_url;
    } catch {
      showError('Failed to start Google Calendar connection.');
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiClient.post('/calendar/disconnect');
      showSuccess('Google Calendar disconnected.');
      setStatus(s => ({ ...s, connected: false }));
      onStatusChange?.();
    } catch {
      showError('Failed to disconnect Google Calendar.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/calendar/sync');
      showSuccess(`Synced ${res.data?.synced ?? 0} appointment${(res.data?.synced ?? 0) !== 1 ? 's' : ''} to Google Calendar.`);
    } catch (err) {
      showError(err?.response?.data?.detail || 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking calendar status…
        </CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Google Calendar not configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set <code className="font-mono bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> and{' '}
              <code className="font-mono bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code> in your backend environment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={status.connected ? 'border-green-500/20 bg-green-500/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              status.connected ? 'bg-green-500/10' : 'bg-muted'
            }`}>
              <Calendar className={`h-5 w-5 ${status.connected ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                Google Calendar
                {status.connected
                  ? <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 border">Connected</Badge>
                  : <Badge variant="secondary" className="text-[10px]">Not connected</Badge>
                }
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status.connected
                  ? 'New appointments are synced automatically. Use Sync to push existing ones.'
                  : 'Connect to automatically add sessions to your Google Calendar.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {status.connected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={handleConnect}
              >
                <Link2 className="h-3.5 w-3.5" />
                Connect Calendar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Schedule() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/appointments');
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(fetchAppointments, 30_000);
    return () => clearInterval(id);
  }, [fetchAppointments]);

  // Refresh on tab focus
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAppointments(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchAppointments]);

  return (
    <div className="flex min-h-screen bg-background">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">

          {/* Page header */}
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
              My Schedule
            </h1>
            <p className="text-muted-foreground mt-1">View and manage your upcoming sessions</p>
          </div>

          {/* Google Calendar integration card */}
          <GoogleCalendarCard onStatusChange={fetchAppointments} />

          {/* Calendar */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5" /> Appointment Calendar
              </CardTitle>
              <CardDescription>
                Your sessions at a glance — click any day to see details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentCalendar
                appointments={appointments}
                loading={loading}
                onRefetch={fetchAppointments}
              />
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
