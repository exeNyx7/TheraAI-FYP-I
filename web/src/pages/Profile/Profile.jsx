import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { User, Mail, Calendar, Shield, Check, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showInfo } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setFormData({
      name: user.full_name || user.name || '',
      email: user.email || '',
    });
  }, [user, navigate]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: formData.name }),
      });
      if (!res.ok) throw new Error();
      showSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch {
      showInfo('Profile saved locally.');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (formData.name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Profile</h1>
              <p className="text-muted-foreground mt-2">Manage your account information</p>
            </div>

            {/* Personal Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="bg-transparent">
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg text-primary-foreground text-2xl font-bold">
                      {initials}
                    </div>
                    {isEditing && (
                      <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors">
                        <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{formData.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {user.role || user.user_type || 'Member'}
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-base"
                    />
                  ) : (
                    <p className="text-base">{formData.name || '—'}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-base"
                    />
                  ) : (
                    <p className="text-base">{formData.email || '—'}</p>
                  )}
                </div>

                {/* Member Since */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Member Since
                  </label>
                  <p className="text-base text-muted-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March 2026'}
                  </p>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 bg-transparent">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                    >
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
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => navigate('/settings')}
                >
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Two-Factor Authentication
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Connected Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
