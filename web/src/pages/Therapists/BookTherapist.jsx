import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, Clock, CheckCircle, ArrowLeft, CreditCard, Shield } from 'lucide-react';
import apiClient from '../../apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function BookTherapist() {
  const { therapistId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromEscalation = location.state?.fromEscalation === true;
  const { showSuccess } = useToast();

  const [therapist, setTherapist] = useState(null);
  const [date, setDate] = useState(tomorrowISO());
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [step, setStep] = useState('select'); // select | payment | confirmed
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdAppt, setCreatedAppt] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get(`/therapists/${therapistId}`);
        if (!cancelled) setTherapist(res.data);
      } catch (e) {
        if (!cancelled) setError('Failed to load therapist details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [therapistId, user, navigate]);

  useEffect(() => {
    if (!therapistId || !date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedTime(null);
    (async () => {
      try {
        const res = await apiClient.get(`/therapists/${therapistId}/availability`, { params: { date } });
        if (!cancelled) setSlots(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [therapistId, date]);

  const handleConfirm = async () => {
    if (!selectedTime) return;
    setSubmitting(true);
    setError('');
    try {
      const isoDate = new Date(`${date}T${selectedTime}:00Z`).toISOString();
      const res = await apiClient.post('/appointments', {
        therapist_id: therapistId,
        date: isoDate,
        duration_minutes: 60,
        notes: '',
      });
      setCreatedAppt(res.data);
      setStep('confirmed');
      // eslint-disable-next-line no-console
      console.log('[booking] confirmed', res.data);
      try { showSuccess('Booking confirmed! Email sent.'); } catch (_) {}
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
            <Button variant="ghost" onClick={() => navigate('/therapists')} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Therapists
            </Button>

            {loading && <p className="text-muted-foreground">Loading...</p>}
            {error && step !== 'confirmed' && <p className="text-red-500">{error}</p>}

            {therapist && (
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {(therapist.name || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{therapist.name}</h2>
                    <p className="text-sm text-muted-foreground">{therapist.email}</p>
                    <p className="text-sm text-primary mt-1">PKR {therapist.hourly_rate || 3000}/session</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'select' && therapist && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" /> Choose a date
                    </label>
                    <input
                      type="date"
                      value={date}
                      min={tomorrowISO()}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" /> Available time slots
                    </label>
                    {slotsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading slots...</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map((s) => (
                          <button
                            key={s.time}
                            disabled={!s.available}
                            onClick={() => setSelectedTime(s.time)}
                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              selectedTime === s.time
                                ? 'border-primary bg-primary text-primary-foreground'
                                : s.available
                                  ? 'border-border hover:border-primary/40'
                                  : 'border-border opacity-40 cursor-not-allowed line-through'
                            }`}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                    {!slotsLoading && slots.length === 0 && (
                      <p className="text-sm text-muted-foreground">No slots available for this date.</p>
                    )}
                  </div>

                  <Button
                    disabled={!selectedTime}
                    onClick={() => setStep('payment')}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 'payment' && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Payment
                  </h3>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                    <p className="text-sm">Session with <span className="font-semibold">{therapist?.name}</span></p>
                    <p className="text-xs text-muted-foreground">{date} at {selectedTime}</p>
                    <p className="text-lg font-bold text-primary mt-2">PKR {therapist?.hourly_rate || 3000}</p>
                  </div>
                  {fromEscalation ? (
                    <div className="rounded-lg border-2 border-green-500/40 p-4 bg-green-500/5">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700">Free First Session — granted via escalation</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">No payment required. Your first session is on us.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-primary/30 p-4 bg-primary/5">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium">Demo mode</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">No actual payment will be charged. This is a demo booking flow.</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('select')} disabled={submitting}>
                      Back
                    </Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleConfirm} disabled={submitting}>
                      {submitting ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
              </Card>
            )}

            {step === 'confirmed' && createdAppt && (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Appointment Confirmed!</h2>
                  <div className="text-muted-foreground space-y-1">
                    <p>Your session with <span className="font-semibold text-foreground">{createdAppt.therapist_name || therapist?.name}</span></p>
                    <p>{new Date(createdAppt.date).toLocaleString()}</p>
                    <Badge className="mt-2">{createdAppt.status}</Badge>
                  </div>
                  <div className="flex gap-3 justify-center pt-4">
                    <Button variant="outline" onClick={() => navigate('/therapists')}>Book Another</Button>
                    <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate('/appointments')}>
                      View My Appointments
                    </Button>
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
