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

const mockAppointments = [
  { id: '1', therapistName: 'Dr. Sarah Mitchell', date: '2026-04-05', time: '10:00 AM', type: 'video', status: 'scheduled' },
  { id: '2', therapistName: 'Dr. James Chen', date: '2026-04-12', time: '2:00 PM', type: 'video', status: 'scheduled' },
];

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState(mockAppointments);
  const [step, setStep] = useState('list'); // list | select-therapist | checkout | success
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleTherapistSelected = (therapist) => {
    setSelectedTherapist(therapist);
    setStep('checkout');
  };

  const handlePaymentSuccess = () => {
    const newAppt = {
      id: Date.now().toString(),
      therapistName: selectedTherapist?.name || 'Dr. TBD',
      date: '2026-05-01',
      time: '11:00 AM',
      type: 'video',
      status: 'scheduled',
    };
    setAppointments(prev => [...prev, newAppt]);
    setStep('success');
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

            {/* Views */}
            {step === 'list' && (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <Card key={apt.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Video className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4" /> {apt.therapistName}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(apt.date).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {apt.time}</span>
                            </div>
                            <Badge className={`mt-2 ${statusColors[apt.status] || statusColors.scheduled}`}>{apt.status}</Badge>
                          </div>
                        </div>
                        <Button
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => { setActiveAppointment(apt); setShowVideoCall(true); }}
                        >
                          Join Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {appointments.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No appointments yet. Book a session to get started.</p>
                  </div>
                )}
              </div>
            )}

            {step === 'select-therapist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Choose a Therapist</h2>
                  <Button variant="ghost" size="icon" onClick={() => setStep('list')}><X className="h-5 w-5" /></Button>
                </div>
                <TherapistSelector onSelect={handleTherapistSelected} />
              </div>
            )}

            {step === 'checkout' && (
              <Card className="max-w-lg mx-auto">
                <CardContent className="p-6">
                  <PaymentCheckout
                    appointment={selectedTherapist ? { therapistName: selectedTherapist.name, date: 'Next available', time: 'TBD' } : null}
                    onSuccess={handlePaymentSuccess}
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
                <p className="text-muted-foreground">Your session with {selectedTherapist?.name} has been confirmed.</p>
                <Button onClick={() => { setStep('list'); setSelectedTherapist(null); }} className="bg-primary hover:bg-primary/90">
                  Back to Appointments
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        patientName={user?.full_name || user?.name || 'Patient'}
        therapistName={activeAppointment?.therapistName || 'Therapist'}
      />
    </div>
  );
}
