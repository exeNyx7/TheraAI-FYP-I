import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import apiClient from '../../apiClient';
import { Heart, Target, Bell, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const REASONS = [
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'depression', label: 'Depression' },
  { id: 'stress', label: 'Stress' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'sleep', label: 'Sleep issues' },
  { id: 'grief', label: 'Grief / Loss' },
  { id: 'trauma', label: 'Trauma' },
  { id: 'other', label: 'Something else' },
];

const GOALS = [
  { id: 'mood_tracking', label: 'Track my mood daily' },
  { id: 'journaling', label: 'Journal regularly' },
  { id: 'ai_chat', label: 'Chat with AI companion' },
  { id: 'therapy', label: 'Connect with a therapist' },
  { id: 'assessments', label: 'Take mental health assessments' },
  { id: 'coping', label: 'Learn coping strategies' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [reasons, setReasons] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState({ email: true, push: false, appointments: true, insights: true });
  const [saving, setSaving] = useState(false);

  const toggleItem = (list, setList, id) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await apiClient.put('/auth/me', {
        onboarding_completed: true,
        notification_preferences: notifications,
      });
    } catch {
      // non-critical
    } finally {
      setSaving(false);
      navigate('/dashboard');
    }
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-6 py-4">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Heart className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold" style={{ fontFamily: 'Montserrat' }}>
          Welcome, {user?.full_name?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-muted-foreground mt-2">
          Let's personalise your TheraAI experience. This takes about 1 minute.
        </p>
      </div>
      <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => setStep(1)}>
        Get started <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
      <button className="text-sm text-muted-foreground hover:underline" onClick={finish}>
        Skip for now
      </button>
    </div>,

    // Step 1: Reasons
    <div key="reasons" className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Montserrat' }}>What brings you here?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {REASONS.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => toggleItem(reasons, setReasons, r.id)}
            className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
              reasons.includes(r.id)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/40'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setStep(2)}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <button className="w-full text-center text-sm text-muted-foreground hover:underline" onClick={finish}>
        Skip
      </button>
    </div>,

    // Step 2: Goals
    <div key="goals" className="space-y-4">
      <div className="text-center">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Montserrat' }}>Set your goals</h2>
        <p className="text-sm text-muted-foreground mt-1">What would you like to do on TheraAI?</p>
      </div>
      <div className="space-y-2">
        {GOALS.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => toggleItem(goals, setGoals, g.id)}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium text-left transition-all flex items-center gap-3 ${
              goals.includes(g.id)
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }`}
          >
            {goals.includes(g.id) && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            {!goals.includes(g.id) && <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />}
            {g.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setStep(3)}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <button className="w-full text-center text-sm text-muted-foreground hover:underline" onClick={finish}>
        Skip
      </button>
    </div>,

    // Step 3: Notifications
    <div key="notifications" className="space-y-4">
      <div className="text-center">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Montserrat' }}>Stay on track</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose which reminders you'd like</p>
      </div>
      <div className="space-y-3">
        {[
          { key: 'appointments', label: 'Appointment reminders' },
          { key: 'insights', label: 'Weekly wellness insights' },
          { key: 'email', label: 'Email notifications' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-accent/5">
            <span className="text-sm font-medium">{label}</span>
            <div
              onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${notifications[key] ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${notifications[key] ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary/90" disabled={saving} onClick={finish}>
          {saving ? 'Saving...' : "Let's go!"}
        </Button>
      </div>
    </div>,
  ];

  const totalSteps = 3;
  const progressSteps = step > 0 ? step : 0;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {step > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round((progressSteps / totalSteps) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full">
              <div
                className="h-1.5 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(progressSteps / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Card className="shadow-xl border-border">
          <CardContent className="pt-6">
            {steps[step]}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
