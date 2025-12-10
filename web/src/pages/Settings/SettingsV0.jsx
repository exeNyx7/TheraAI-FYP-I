import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Bell, Lock, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function SettingsV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showInfo } = useToast();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    appointments: true,
    insights: true,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    showInfo(`${key} notifications ${notifications[key] ? 'disabled' : 'enabled'}`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Settings
              </h1>
              <p className="text-muted-foreground mt-2">Customize your experience</p>
            </div>

            {/* Notifications */}
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose what notifications you'd like to receive
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Get updates via email</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('email')}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      notifications.email ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        notifications.email ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Browser notifications</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('push')}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      notifications.push ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        notifications.push ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Appointment Reminders</p>
                    <p className="text-sm text-muted-foreground">Reminders before appointments</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('appointments')}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      notifications.appointments ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        notifications.appointments ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Wellness Insights</p>
                    <p className="text-sm text-muted-foreground">Tips and insights about your wellbeing</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('insights')}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      notifications.insights ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        notifications.insights ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  Notification preferences will be saved automatically
                </p>
              </div>
            </Card>

            {/* Privacy */}
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Privacy
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Share Mood with Therapist</p>
                    <p className="text-sm text-muted-foreground">Allow assigned therapist to view your moods</p>
                  </div>
                  <button className="h-6 w-11 rounded-full bg-primary">
                    <div className="h-5 w-5 rounded-full bg-white translate-x-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Anonymous Data Collection</p>
                    <p className="text-sm text-muted-foreground">Help improve Thera-AI with anonymous usage data</p>
                  </div>
                  <button className="h-6 w-11 rounded-full bg-primary">
                    <div className="h-5 w-5 rounded-full bg-white translate-x-5" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  Your journal entries and personal data are always private
                </p>
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="border-destructive/50">
              <div className="p-6 border-b border-destructive/20">
                <h3 className="text-xl font-semibold flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Irreversible and destructive actions
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <p className="text-sm font-medium mb-2">Delete Account</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. All your data including journal entries,
                    mood logs, and chat history will be permanently deleted.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
                    disabled
                  >
                    Delete Account
                  </Button>
                </div>

                <div className="p-4 border border-orange-500/30 rounded-lg bg-orange-500/5">
                  <p className="text-sm font-medium mb-2 text-orange-600">Clear All Data</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Remove all your journal entries, mood logs, and chat history. Your account will remain active.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600 hover:text-orange-600 hover:bg-orange-500/10 border-orange-500/50"
                    disabled
                  >
                    Clear All Data
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  These features are currently disabled for safety
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
