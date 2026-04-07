import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import apiClient from '../../apiClient';
import {
  Heart, Brain, Moon, Users, Target, Bell, ArrowRight, ArrowLeft,
  CheckCircle2, Sparkles,
} from 'lucide-react';

// ─── Step configuration ───────────────────────────────────────────────────────
const TOTAL_STEPS = 4;

const REASONS = [
  { id: 'anxiety',      label: 'Anxiety or Worry',         icon: Brain },
  { id: 'depression',   label: 'Low Mood / Depression',    icon: Heart },
  { id: 'stress',       label: 'Stress & Burnout',         icon: Sparkles },
  { id: 'relationships',label: 'Relationship Challenges',  icon: Users },
  { id: 'sleep',        label: 'Sleep Problems',           icon: Moon },
  { id: 'self-esteem',  label: 'Self-Esteem',              icon: CheckCircle2 },
  { id: 'other',        label: 'Something Else',           icon: Target },
];

const GOALS = [
  { id: 'mood',      label: 'Track my mood daily' },
  { id: 'journal',   label: 'Journal my thoughts' },
  { id: 'therapist', label: 'Connect with a therapist' },
  { id: 'chat',      label: 'Talk to the AI companion' },
  { id: 'assessments', label: 'Take mental health assessments' },
  { id: 'habits',    label: 'Build healthier habits' },
];

// ─────────────────────────────────────────────────────────────────────────────

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < step ? 'bg-primary' : i === step - 1 ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

function MultiChip({ items, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                : 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [reasons, setReasons]     = useState([]);
  const [goals, setGoals]         = useState([]);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyInsights, setNotifyInsights]   = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    // If already onboarded, skip
    if (user.onboarding_completed) navigate('/dashboard');
  }, [user, navigate]);

  const toggleItem = (setter) => (id) =>
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSkip = () => navigate('/dashboard');

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiClient.put('/auth/me', {
        onboarding_completed: true,
        notification_preferences: {
          email: notifyReminders,
          push: notifyReminders,
          appointments: notifyReminders,
          insights: notifyInsights,
        },
      });
    } catch {
      // best-effort — still navigate even if save fails
    } finally {
      setSaving(false);
      navigate('/dashboard');
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const displayName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-xl font-bold text-primary-foreground" style={{ fontFamily: 'Montserrat' }}>T</span>
          </div>
        </div>

        <Card className="shadow-xl border-border">
          <CardContent className="p-8">
            <ProgressBar step={step} />

            {/* ── Step 1: Welcome ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                    Welcome, {displayName}! 👋
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg leading-relaxed">
                    TheraAI is your personal mental wellness companion. In the next minute,
                    we'll personalise your experience so we can support you in the best way possible.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {[
                    { icon: Brain, label: 'AI Chat Support', desc: 'Talk to Thera, your empathetic AI companion' },
                    { icon: Heart, label: 'Mood Tracking',   desc: 'Track how you feel over time' },
                    { icon: Users, label: 'Real Therapists', desc: 'Book sessions with licensed professionals' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: Reasons ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                    What brought you here?
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Select all that apply. This helps us personalise your experience.
                  </p>
                </div>
                <MultiChip
                  items={REASONS}
                  selected={reasons}
                  onToggle={toggleItem(setReasons)}
                />
              </div>
            )}

            {/* ── Step 3: Goals ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                    What would you like to do?
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Pick the features you're most interested in — you can always explore more later.
                  </p>
                </div>
                <MultiChip
                  items={GOALS}
                  selected={goals}
                  onToggle={toggleItem(setGoals)}
                />
              </div>
            )}

            {/* ── Step 4: Notifications ── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                    Stay on track
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Would you like gentle reminders to help you build a routine?
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      state: notifyReminders,
                      setter: setNotifyReminders,
                      label: 'Daily Check-in Reminders',
                      desc: 'A gentle nudge to log your mood or journal',
                      icon: Bell,
                    },
                    {
                      state: notifyInsights,
                      setter: setNotifyInsights,
                      label: 'Wellness Insights',
                      desc: 'Personalised tips based on your mood trends',
                      icon: Sparkles,
                    },
                  ].map(({ state, setter, label, desc, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setter(!state)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 ${
                        state
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${state ? 'bg-primary/20' : 'bg-muted'}`}>
                          <Icon className={`h-5 w-5 ${state ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${state ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {state && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 p-4 bg-muted/40 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    You can always change notification settings in <strong>Settings</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* ── Navigation buttons ── */}
            <div className="flex items-center justify-between pt-8">
              <div>
                {step > 1 ? (
                  <Button variant="ghost" onClick={back} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                    Skip for now
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step < TOTAL_STEPS ? (
                  <>
                    {step > 1 && (
                      <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground text-sm">
                        Skip
                      </Button>
                    )}
                    <Button onClick={next} className="bg-primary hover:bg-primary/90 gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleFinish}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 gap-2 px-6"
                  >
                    {saving ? 'Setting up...' : "Let's Go!"}
                    {!saving && <Sparkles className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Step indicator */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Step {step} of {TOTAL_STEPS}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
