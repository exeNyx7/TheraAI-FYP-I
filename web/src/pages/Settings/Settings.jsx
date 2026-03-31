import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Bell, Moon, Lock, Trash2, Shield, Key, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`h-6 w-11 rounded-full transition-colors duration-300 ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [notifications, setNotifications] = useState({
    email: true, push: true, appointments: true, insights: true,
  });
  const [privacy, setPrivacy] = useState({ shareWithTherapist: true });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Check Google Calendar connection status on mount
  useEffect(() => {
    if (!user) return;
    apiClient.get('/calendar/status')
      .then(res => setCalendarConnected(res.data.connected))
      .catch(() => {});
  }, [user]);

  // Handle redirect from Google OAuth callback
  useEffect(() => {
    const connected = searchParams.get('calendar_connected');
    if (connected === 'true') {
      setCalendarConnected(true);
      showSuccess('Google Calendar connected successfully!');
    } else if (connected === 'false') {
      showError('Failed to connect Google Calendar. Please try again.');
    }
  }, [searchParams]);

  const handleConnectCalendar = async () => {
    setCalendarLoading(true);
    try {
      const res = await apiClient.get('/calendar/auth-url');
      window.location.href = res.data.auth_url;
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Google Calendar integration is not configured.';
      showError(msg);
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    setCalendarLoading(true);
    try {
      await apiClient.post('/calendar/disconnect');
      setCalendarConnected(false);
      showSuccess('Google Calendar disconnected.');
    } catch {
      showError('Failed to disconnect Google Calendar.');
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      showError('New passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token');
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: passwords.current, new_password: passwords.newPass }),
      });
      if (!res.ok) throw new Error();
      showSuccess('Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch {
      showError('Failed to change password. Check current password.');
    } finally { setIsChangingPassword(false); }
  };

  const notificationItems = [
    { key: 'email', label: 'Email Notifications', desc: 'Get updates via email' },
    { key: 'push', label: 'Push Notifications', desc: 'Browser notifications' },
    { key: 'appointments', label: 'Appointment Reminders', desc: 'Reminders before appointments' },
    { key: 'insights', label: 'Wellness Insights', desc: 'Tips and insights about your wellbeing' },
  ];

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Settings</h1>
              <p className="text-muted-foreground mt-2">Customize your experience</p>
            </div>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5" /> Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
                <CardDescription>Choose what notifications you'd like to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notificationItems.map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Toggle checked={notifications[item.key]} onChange={() => toggleNotification(item.key)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Share Mood with Therapist</p>
                    <p className="text-sm text-muted-foreground">Allow your assigned therapist to view your mood data</p>
                  </div>
                  <Toggle checked={privacy.shareWithTherapist} onChange={() => setPrivacy(p => ({ ...p, shareWithTherapist: !p.shareWithTherapist }))} />
                </div>
              </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Google Calendar
                </CardTitle>
                <CardDescription>Sync your therapy appointments to Google Calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {calendarConnected ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {calendarConnected ? 'Google Calendar Connected' : 'Google Calendar Not Connected'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {calendarConnected
                          ? 'New appointments are automatically added to your calendar'
                          : 'Connect to automatically sync appointments'}
                      </p>
                    </div>
                  </div>
                  {calendarConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectCalendar}
                      disabled={calendarLoading}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    >
                      {calendarLoading ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectCalendar}
                      disabled={calendarLoading}
                    >
                      {calendarLoading ? 'Redirecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Security</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={passwords.current}
                      onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={passwords.newPass}
                      onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwords.confirm}
                      onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" disabled={isChangingPassword || !passwords.current || !passwords.newPass} className="bg-primary hover:bg-primary/90">
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!showDeleteConfirm ? (
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="w-full justify-start text-destructive hover:text-destructive bg-transparent">
                    Delete Account
                  </Button>
                ) : (
                  <div className="p-4 border border-destructive/30 rounded-lg space-y-3 bg-destructive/5">
                    <p className="text-sm font-medium text-destructive">Are you sure? This action cannot be undone.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-transparent">Cancel</Button>
                      <Button variant="destructive" onClick={() => { logout(); navigate('/'); }} className="flex-1">
                        Yes, Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
