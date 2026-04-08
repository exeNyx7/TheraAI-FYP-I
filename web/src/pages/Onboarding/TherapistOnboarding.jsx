import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import apiClient from '../../apiClient';
import {
  Briefcase, Globe, Clock, DollarSign, BookOpen,
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles, User,
} from 'lucide-react';

const TOTAL_STEPS = 4;

const SPECIALIZATIONS = [
  'Anxiety & Stress', 'Depression', 'Trauma & PTSD', 'Relationship Counselling',
  'Grief & Loss', 'Addiction & Recovery', 'Child & Adolescent', 'OCD',
  'Eating Disorders', 'ADHD', 'Couples Therapy', 'Mindfulness-Based CBT',
];

const LANGUAGES = [
  'English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Arabic', 'French', 'Other',
];

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < step ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

// Step 1 — Welcome
function StepWelcome({ data, onChange, onNext }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to Thera-AI</h2>
        <p className="text-muted-foreground">
          Let's set up your therapist profile so patients can find and connect with you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Credentials / Title
          </label>
          <Input
            placeholder="e.g. MBBS, MD Psychiatry"
            value={data.credentials}
            onChange={e => onChange('credentials', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Years of Experience
          </label>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 5"
            value={data.years_of_experience}
            onChange={e => onChange('years_of_experience', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Short Professional Bio</label>
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Briefly describe your approach and what you help patients with…"
            value={data.bio}
            onChange={e => onChange('bio', e.target.value)}
          />
        </div>
      </div>

      <Button className="w-full gap-2" onClick={onNext}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Step 2 — Specializations & Languages
function StepSpecializations({ data, onChange, onNext, onBack }) {
  const toggle = (field, value) => {
    const list = data[field] || [];
    onChange(field, list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Specializations</h2>
        <p className="text-sm text-muted-foreground">Select all areas you work with</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SPECIALIZATIONS.map(s => {
          const active = (data.specializations || []).includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle('specializations', s)}
              className={`p-2.5 rounded-lg border-2 text-sm text-left transition-all ${
                active ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'
              }`}
            >
              {active && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-primary" />}
              {s}
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-1">Languages</h2>
        <p className="text-sm text-muted-foreground">Languages you can conduct sessions in</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {LANGUAGES.map(l => {
            const active = (data.languages || []).includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggle('languages', l)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button className="flex-1 gap-2" onClick={onNext}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 3 — Availability & Fees
function StepAvailability({ data, onChange, onNext, onBack }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Availability & Fees</h2>
        <p className="text-sm text-muted-foreground">Help patients know when they can reach you</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Session Duration (min)
            </label>
            <Input
              type="number"
              min={15}
              step={15}
              placeholder="60"
              value={data.session_duration}
              onChange={e => onChange('session_duration', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Session Fee (PKR)
            </label>
            <Input
              type="number"
              min={0}
              placeholder="3000"
              value={data.session_fee}
              onChange={e => onChange('session_fee', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Working Days</label>
          <div className="flex flex-wrap gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
              const active = (data.working_days || []).includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const list = data.working_days || [];
                    onChange('working_days', active ? list.filter(v => v !== d) : [...list, d]);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Time</label>
            <Input
              type="time"
              value={data.work_start}
              onChange={e => onChange('work_start', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Time</label>
            <Input
              type="time"
              value={data.work_end}
              onChange={e => onChange('work_end', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button className="flex-1 gap-2" onClick={onNext}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 4 — Profile Photo & Finish
function StepFinish({ data, onChange, onSubmit, onBack, saving }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Almost There!</h2>
        <p className="text-muted-foreground">Add a profile photo and you're ready to start helping patients.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Profile Photo URL (optional)</label>
          <Input
            placeholder="https://example.com/photo.jpg"
            value={data.avatar_url}
            onChange={e => onChange('avatar_url', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Paste a public image URL. You can update this later in your profile.</p>
        </div>

        {data.avatar_url && (
          <div className="flex justify-center">
            <img
              src={data.avatar_url}
              alt="Preview"
              className="h-24 w-24 rounded-full object-cover border-4 border-primary/20"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
        <p className="text-sm font-medium text-primary">Your profile summary</p>
        {data.credentials && <p className="text-sm text-muted-foreground">{data.credentials} · {data.years_of_experience || 0} yrs experience</p>}
        {(data.specializations || []).length > 0 && (
          <p className="text-sm text-muted-foreground">{data.specializations.slice(0, 3).join(', ')}{data.specializations.length > 3 ? ` +${data.specializations.length - 3} more` : ''}</p>
        )}
        {data.session_fee && <p className="text-sm text-muted-foreground">PKR {data.session_fee} / session</p>}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2" disabled={saving}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button className="flex-1 gap-2" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Complete Setup'} <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TherapistOnboarding() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    credentials: '',
    years_of_experience: '',
    bio: '',
    specializations: [],
    languages: ['English'],
    session_duration: '60',
    session_fee: '',
    working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    work_start: '09:00',
    work_end: '17:00',
    avatar_url: '',
  });

  const onChange = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Update user: mark onboarding complete + bio/avatar
      const mePayload = {
        onboarding_completed: true,
        bio: data.bio || undefined,
        avatar_url: data.avatar_url || undefined,
      };
      const meRes = await apiClient.put('/auth/me', mePayload);
      updateUser(meRes.data);

      // Upsert therapist profile
      const profilePayload = {
        credentials: data.credentials,
        years_of_experience: parseInt(data.years_of_experience) || 0,
        specializations: data.specializations,
        languages: data.languages,
        session_duration_minutes: parseInt(data.session_duration) || 60,
        session_fee: parseFloat(data.session_fee) || 0,
        working_days: data.working_days,
        working_hours: { start: data.work_start, end: data.work_end },
      };
      await apiClient.post('/therapist/profile', profilePayload).catch(() =>
        apiClient.put('/therapist/profile', profilePayload)
      );

      navigate('/dashboard');
    } catch (err) {
      console.error('Therapist onboarding save failed:', err);
      // Still navigate — profile can be completed later
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-xl font-semibold">Thera-AI</span>
          </div>
          <p className="text-sm text-muted-foreground">Therapist Setup — Step {step} of {TOTAL_STEPS}</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <ProgressBar step={step} />

            {step === 1 && (
              <StepWelcome data={data} onChange={onChange} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <StepSpecializations data={data} onChange={onChange} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <StepAvailability data={data} onChange={onChange} onNext={() => setStep(4)} onBack={() => setStep(2)} />
            )}
            {step === 4 && (
              <StepFinish data={data} onChange={onChange} onSubmit={handleSubmit} onBack={() => setStep(3)} saving={saving} />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
