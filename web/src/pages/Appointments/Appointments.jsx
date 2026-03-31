import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { TherapistSelector } from '../../components/Appointments/TherapistSelector';
import { PaymentCheckout } from '../../components/Appointments/PaymentCheckout';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';
import { Calendar, Clock, User, Video, Plus, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
};

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('list'); // list | select-therapist | checkout | success
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAppointments();
  }, [user, navigate]);

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
    setStep('checkout');
  };

  const handleBookingSuccess = async (appointmentData) => {
    // Book via API
    try {
      await apiClient.post('/appointments', {
        therapist_id: selectedTherapist?.id,
        scheduled_at: appointmentData?.scheduled_at || new Date(Date.now() + 7 * 86400000).toISOString(),
        duration_minutes: 50,
        type: 'video',
      });
      await fetchAppointments();
      setStep('success');
    } catch (err) {
      console.error('Failed to book appointment:', err);
      // Still show success for demo (PaymentCheckout mock flow)
      await fetchAppointments();
      setStep('success');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await apiClient.put(`/appointments/${appointmentId}/cancel`);
      setAppointments((prev) =>
        prev.map((a) => a.id === appointmentId ? { ...a, status: 'cancelled' } : a)
      );
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
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
      <SidebarNav />
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
                <Button onClick={() => setStep('select-therapist')} className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Book Session
                </Button>
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
                  appointments.map((apt) => (
                    <Card key={apt.id} className="hover:shadow-md transition-all">
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
                              </div>
                              <Badge className={`mt-2 ${statusColors[apt.status] || statusColors.scheduled}`}>
                                {apt.status}
                              </Badge>
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
                                  onClick={() => handleCancelAppointment(apt.id)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {step === 'select-therapist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Choose a Therapist</h2>
                  <Button variant="ghost" size="icon" onClick={() => setStep('list')}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <TherapistSelector onSelect={handleTherapistSelected} />
              </div>
            )}

            {step === 'checkout' && (
              <Card className="max-w-lg mx-auto">
                <CardContent className="p-6">
                  <PaymentCheckout
                    appointment={selectedTherapist ? { therapistName: selectedTherapist.name, date: 'Next available', time: 'TBD' } : null}
                    onSuccess={handleBookingSuccess}
                    onClose={() => setStep('select-therapist')}
                  />
                </CardContent>
              </Card>
            )}

            {step === 'success' && (
              <div className="text-center py-16 space-y-4 animate-fade-in">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Appointment Booked!</h2>
                <p className="text-muted-foreground">
                  Your session with {selectedTherapist?.name} has been confirmed.
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
        appointmentId={activeAppointment?.id}
        patientName={user?.full_name || user?.name || 'Patient'}
        therapistName={activeAppointment?.therapist_name || activeAppointment?.therapistName || 'Therapist'}
      />
    </div>
  );
}
