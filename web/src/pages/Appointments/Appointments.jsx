import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { TherapistSelector } from '../../components/Appointments/TherapistSelector';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';
import { Calendar, Clock, User, Video, Plus, CheckCircle, X, Loader2, ChevronLeft, CreditCard, Shield, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../apiClient';
import { useToast } from '../../contexts/ToastContext';

const DURATIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 25, label: '25 min' },
  { minutes: 30, label: '30 min' },
];
const MULTIPLIERS = { 15: 1.0, 25: 1.6, 30: 2.0 };
function calcFee(baseRate, minutes) {
  return Math.round((baseRate || 2500) * (MULTIPLIERS[minutes] || 1.6));
}
function fmtPKR(n) {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
};

function SlotPicker({ therapistId, onSlotSelected, onBack }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError(null);
    apiClient.get(`/therapists/${therapistId}/slots`, { params: { date } })
      .then((res) => {
        const normalized = Array.isArray(res.data)
          ? res.data.map((slot) => ({
              ...slot,
              start_time: slot.start_time || slot.time,
              is_available: slot.is_available ?? slot.available ?? false,
            }))
          : [];
        setSlots(normalized);
      })
      .catch(() => setError('Could not load slots.'))
      .finally(() => setLoading(false));
  }, [therapistId, date]);

  const available = slots.filter((s) => s.is_available);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-semibold">Select a Date & Time</h2>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading slots…
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {!loading && !error && available.length === 0 && (
        <p className="text-muted-foreground text-sm">No available slots on this date. Try another day.</p>
      )}

      {!loading && available.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Available slots</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {available.map((slot) => (
              <button
                key={slot.start_time}
                onClick={() => onSlotSelected({ date, slot })}
                className="border border-primary/40 rounded-lg py-2 px-3 text-sm font-medium hover:bg-primary/10 hover:border-primary transition-colors"
              >
                {slot.start_time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('list'); // list | select-therapist | select-slot | checkout | success
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [selectedDateSlot, setSelectedDateSlot] = useState(null); // { date, slot }
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [submitting, setSubmitting] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAppointments();
  }, [user, navigate]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Refetch when tab becomes visible (e.g. returning from Stripe)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAppointments(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        apiClient.get('/payments/verify-session', { params: { session_id: sessionId } })
          .catch(() => {})
          .finally(() => {
            showSuccess('Payment confirmed! Your session has been booked.');
            fetchAppointments();
          });
      } else {
        showSuccess('Payment confirmed! Your session has been booked.');
        fetchAppointments();
      }
    }
    if (searchParams.get('payment') === 'cancelled') {
      showError('Payment was cancelled. Your booking was not confirmed.');
    }
  }, [searchParams]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/appointments');
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleTherapistSelected = (therapist) => {
    setSelectedTherapist(therapist);
    setStep('select-slot');
  };

  const handleSlotSelected = ({ date, slot }) => {
    setSelectedDateSlot({ date, slot });
    setStep('checkout');
  };

  const handleBooking = async () => {
    const therapistId = selectedTherapist?.user_id || selectedTherapist?.id;
    const selectedDate = selectedDateSlot?.date;
    const selectedTime = selectedDateSlot?.slot?.start_time || selectedDateSlot?.slot?.time;

    if (!therapistId || !selectedDate || !selectedTime) {
      setError('Please select a therapist and valid time slot.');
      return;
    }

    // Past-slot guard — must be at least 1 hour from now
    const slotDateTime = new Date(`${selectedDate}T${selectedTime}:00Z`);
    if (slotDateTime < new Date(Date.now() + 60 * 60 * 1000)) {
      setError('This slot is too soon. Please book at least 1 hour in advance.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00Z`).toISOString();
      const res = await apiClient.post('/payments/book-session', {
        therapist_id: therapistId,
        scheduled_at: scheduledAt,
        duration_minutes: selectedDuration,
      });

      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }

      await fetchAppointments();
      setStep('success');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!appointmentId) return;
    try {
      await apiClient.put(`/appointments/${appointmentId}/cancel`);
      setAppointments((prev) =>
        prev.map((a) => (a.id || a._id) === appointmentId ? { ...a, status: 'cancelled' } : a)
      );
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const resetBooking = () => {
    setStep('list');
    setSelectedTherapist(null);
    setSelectedDateSlot(null);
    setSelectedDuration(25);
    setError(null);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>My Appointments</h1>
                <p className="text-muted-foreground mt-2">Manage your therapy sessions</p>
              </div>
              {step === 'list' && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={fetchAppointments} title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {user?.role === 'patient' && (
                    <Button onClick={() => setStep('select-therapist')} className="gap-2 bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4" /> Book Session
                    </Button>
                  )}
                </div>
              )}
              {step !== 'list' && (
                <Button variant="ghost" size="icon" onClick={resetBooking}><X className="h-5 w-5" /></Button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Views */}
            {step === 'list' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No appointments yet. Book a session to get started.</p>
                  </div>
                ) : (
                  appointments.map((apt) => {
                    const aptId = apt.id || apt._id;
                    return (
                    <Card key={aptId} className="hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Video className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {apt.therapist_name || apt.therapistName || 'Therapist'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(apt.scheduled_at || apt.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatTime(apt.scheduled_at || apt.time)}
                                </span>
                                {apt.duration_minutes && (
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                    {apt.duration_minutes} min
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge className={`${statusColors[apt.status] || statusColors.scheduled}`}>
                                  {apt.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {apt.status === 'scheduled' && (
                              <>
                                <Button
                                  className="bg-primary hover:bg-primary/90"
                                  onClick={() => { setActiveAppointment(apt); setShowVideoCall(true); }}
                                >
                                  Join Session
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive border-destructive/30"
                                  onClick={() => handleCancelAppointment(aptId)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* Select therapist */}
            {step === 'select-therapist' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setStep('list')}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-semibold">Choose a Therapist</h2>
                  <Button variant="ghost" size="icon" onClick={() => setStep('list')}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <TherapistSelector onSelect={handleTherapistSelected} />
              </div>
            )}

            {/* Select slot */}
            {step === 'select-slot' && selectedTherapist && (
              <SlotPicker
                therapistId={selectedTherapist.user_id || selectedTherapist.id}
                onSlotSelected={handleSlotSelected}
                onBack={() => setStep('select-therapist')}
              />
            )}

            {/* Checkout */}
            {step === 'checkout' && (
              <Card className="max-w-lg mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Confirm & Pay
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Session with <strong>{selectedTherapist?.full_name || selectedTherapist?.name}</strong>{' '}
                    on <strong>{selectedDateSlot?.date}</strong> at{' '}
                    <strong>{selectedDateSlot?.slot?.start_time || selectedDateSlot?.slot?.time}</strong>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Duration picker */}
                  <div>
                    <p className="text-sm font-medium mb-2">Session duration</p>
                    <div className="grid grid-cols-3 gap-2">
                      {DURATIONS.map((d) => {
                        const baseRate = selectedTherapist?.hourly_rate || selectedTherapist?.session_fee_pkr || 2500;
                        const fee = calcFee(baseRate, d.minutes);
                        return (
                          <button
                            key={d.minutes}
                            onClick={() => setSelectedDuration(d.minutes)}
                            className={`p-3 rounded-lg border-2 text-sm transition-all ${
                              selectedDuration === d.minutes ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <span className="font-semibold block">{d.label}</span>
                            <span className="text-xs font-medium mt-0.5 block text-primary">
                              {fmtPKR(fee)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment method indicator */}
                  {(() => {
                    const baseRate = selectedTherapist?.hourly_rate || selectedTherapist?.session_fee_pkr || 2500;
                    const fee = calcFee(baseRate, selectedDuration);
                    return (
                      <>
                        <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                          <p className="text-sm font-medium">
                            <span className="text-primary font-bold">{fmtPKR(fee)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{selectedDuration} min · video session</p>
                        </div>
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2 text-sm">
                          <ExternalLink className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">You'll be redirected to Stripe</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Test card: <code className="font-mono">4242 4242 4242 4242</code> · any future expiry · any CVV
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('select-slot')} disabled={submitting}>
                      Back
                    </Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleBooking} disabled={submitting}>
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</> : 'Confirm'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success */}
            {step === 'success' && (
              <div className="text-center py-16 space-y-4 animate-fade-in">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Appointment Booked!</h2>
                <p className="text-muted-foreground">
                  Your session with {selectedTherapist?.full_name || selectedTherapist?.name} has been confirmed.
                </p>
                <Button
                  onClick={() => { setStep('list'); setSelectedTherapist(null); }}
                  className="bg-primary hover:bg-primary/90"
                >
                  Back to Appointments
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Jitsi-powered video call modal */}
      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => { setShowVideoCall(false); setActiveAppointment(null); }}
        appointmentId={activeAppointment?.id || activeAppointment?._id}
        patientName={user?.full_name || user?.name || 'Patient'}
        therapistName={activeAppointment?.therapist_name || activeAppointment?.therapistName || 'Therapist'}
      />
    </div>
  );
}
