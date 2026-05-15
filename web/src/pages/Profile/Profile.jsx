import { useState, useEffect, useCallback } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { User, Mail, Calendar, Shield, Check, Phone, MapPin, Briefcase, AlertCircle, Link2, Link2Off, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function Field({ label, icon: Icon, value, editing, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />} {label}
      </label>
      {editing ? children : (
        <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      )}
      {hint && editing && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GoogleCalendarSection() {
  const { showSuccess, showError } = useToast();
  const [status, setStatus] = useState(null);
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

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    const val = params.get('calendar_connected');
    if (val === 'true') {
      showSuccess('Google Calendar connected!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (val === 'false') {
      showError('Google Calendar connection failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus, showSuccess, showError]);

  const handleConnect = async () => {
    try {
      const res = await apiClient.get('/calendar/auth-url', { params: { redirect_page: 'profile' } });
      if (res.data?.auth_url) window.location.href = res.data.auth_url;
    } catch { showError('Failed to start Google Calendar connection.'); }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiClient.post('/calendar/disconnect');
      showSuccess('Google Calendar disconnected.');
      setStatus(s => ({ ...s, connected: false }));
    } catch { showError('Failed to disconnect.'); }
    finally { setDisconnecting(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/calendar/sync');
      showSuccess(`Synced ${res.data?.synced ?? 0} appointment(s) to Google Calendar.`);
    } catch (err) {
      showError(err?.response?.data?.detail || 'Sync failed.');
    } finally { setSyncing(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Integrations
        </CardTitle>
        <CardDescription>Connect external services to your account</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking status…
          </div>
        ) : !status?.configured ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-700">Google Calendar not configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admin must set <code className="font-mono bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> and{' '}
              <code className="font-mono bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code>.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                status.connected ? 'bg-green-500/10' : 'bg-muted'
              }`}>
                <Calendar className={`h-5 w-5 ${status.connected ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  Google Calendar
                  {status.connected
                    ? <Badge className="text-[10px] bg-green-100 text-green-700 border border-green-200">Connected</Badge>
                    : <Badge variant="secondary" className="text-[10px]">Not connected</Badge>
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status.connected
                    ? 'Appointments are synced automatically when booked.'
                    : 'Sync your therapy sessions to Google Calendar.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status.connected ? (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleSync} disabled={syncing}>
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleDisconnect} disabled={disconnecting}
                  >
                    {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={handleConnect}>
                  <Link2 className="h-3.5 w-3.5" /> Connect
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    age: '',
    gender: '',
    profession: '',
    location: '',
    bio: '',
    phone: '',
    emergency_contact: '',
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      age: user.age ?? '',
      gender: user.gender || '',
      profession: user.profession || '',
      location: user.location || '',
      bio: user.bio || '',
      phone: user.phone || '',
      emergency_contact: user.emergency_contact || '',
    });
  }, [user, navigate]);

  const set = (key) => (e) => setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.full_name || undefined,
        age: formData.age !== '' ? Number(formData.age) : undefined,
        gender: formData.gender || undefined,
        profession: formData.profession || undefined,
        location: formData.location || undefined,
        bio: formData.bio || undefined,
        phone: formData.phone || undefined,
        emergency_contact: formData.emergency_contact || undefined,
      };
      await apiClient.put('/auth/me', payload);
      showSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (formData.full_name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  if (!user) return null;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 lg:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Profile</h1>
              <p className="text-muted-foreground mt-2">Manage your account information</p>
            </div>

            {/* Personal Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your name and contact details</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="bg-transparent">
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg text-primary-foreground text-2xl font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{formData.full_name || '—'}</p>
                    <p className="text-sm text-muted-foreground capitalize">{user.role || 'Member'}</p>
                    {user.created_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Full Name" icon={User} value={formData.full_name} editing={isEditing}>
                    <Input value={formData.full_name} onChange={set('full_name')} placeholder="Your full name" />
                  </Field>

                  <Field label="Email Address" icon={Mail} value={formData.email} editing={false}>
                    <Input value={formData.email} disabled />
                  </Field>

                  <Field label="Age" icon={Calendar} value={formData.age} editing={isEditing} hint="Must be 13 or older">
                    <Input type="number" min={13} max={120} value={formData.age} onChange={set('age')} placeholder="Your age" />
                  </Field>

                  <Field label="Gender" icon={User} value={GENDER_OPTIONS.find(g => g.value === formData.gender)?.label} editing={isEditing}>
                    <select
                      value={formData.gender}
                      onChange={set('gender')}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {GENDER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Profession" icon={Briefcase} value={formData.profession} editing={isEditing}>
                    <Input value={formData.profession} onChange={set('profession')} placeholder="e.g. Student, Software Engineer" />
                  </Field>

                  <Field label="Location" icon={MapPin} value={formData.location} editing={isEditing}>
                    <Input value={formData.location} onChange={set('location')} placeholder="e.g. Karachi, Pakistan" />
                  </Field>

                  <Field label="Phone" icon={Phone} value={formData.phone} editing={isEditing}>
                    <Input value={formData.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
                  </Field>

                  <Field label="Emergency Contact" icon={AlertCircle} value={formData.emergency_contact} editing={isEditing} hint="Name + phone number">
                    <Input value={formData.emergency_contact} onChange={set('emergency_contact')} placeholder="e.g. Ali Khan +92 300 1234567" />
                  </Field>
                </div>

                {/* Bio — full width */}
                <Field label="Bio" icon={null} value={formData.bio} editing={isEditing}>
                  <textarea
                    value={formData.bio}
                    onChange={set('bio')}
                    placeholder="A short bio about yourself..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/500</p>
                </Field>

                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 bg-transparent">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
                      {isSaving ? 'Saving...' : <><Check className="h-4 w-4" /> Save Changes</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Security
                </CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => navigate('/settings')}>
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" disabled>
                  Two-Factor Authentication <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                </Button>
              </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <GoogleCalendarSection />
          </div>
        </div>
      </main>
    </div>
  );
}
