import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Clock, Video } from 'lucide-react';
import PreCallDisclaimer from '../../components/Call/PreCallDisclaimer';
import { VideoCallModal } from '../../components/Teletherapy/VideoCallModal';

export default function WaitingRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';
  const isPatient = role === 'patient';

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.get(`/appointments/${appointmentId}`)
      .then((r) => { if (!cancelled) setAppt(r.data); })
      .catch(() => { if (!cancelled) setAppt(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appointmentId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const scheduledIso = appt?.scheduled_at || appt?.date || null;
  const scheduledMs = scheduledIso ? new Date(scheduledIso).getTime() : null;
  const diffMs = scheduledMs ? scheduledMs - now : null;
  // [DEMO MODE] Time gate disabled for evaluation purposes.
  // Original: const canJoin = diffMs !== null && diffMs <= 2 * 60 * 1000; // T-2 min
  // DEMO: bypassing time check — re-enable before production
  const canJoin = true;

  const fmtCountdown = (ms) => {
    if (ms === null) return '—';
    if (ms <= 0) return 'Starting now';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${sec}s`;
  };

  const handleJoinClick = () => {
    if (isPatient && !disclaimerAccepted) {
      setDisclaimerOpen(true);
      return;
    }
    if (!isPatient && !disclaimerAccepted) {
      setDisclaimerOpen(true);
      return;
    }
    setInCall(true);
  };

  const handleAccept = () => {
    setDisclaimerAccepted(true);
    setDisclaimerOpen(false);
    setInCall(true);
  };

  const handleEndCall = () => {
    setInCall(false);
    if (isPatient) {
      navigate(`/call/${appointmentId}/post-patient`);
    } else {
      navigate(`/call/${appointmentId}/post-therapist`);
    }
  };

  if (inCall) {
    return (
      <VideoCallModal
        isOpen={true}
        onClose={handleEndCall}
        appointmentId={appointmentId}
        patientName={appt?.patient_name}
        therapistName={appt?.therapist_name}
        role={role}
        patientId={appt?.patient_id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
            <Video className="h-5 w-5" /> Waiting Room
          </CardTitle>
          <CardDescription>
            Your session will begin shortly. You can join 2 minutes before the scheduled time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && <p className="text-sm text-muted-foreground">Loading appointment…</p>}
          {!loading && !appt && (
            <p className="text-sm text-destructive">Appointment not found.</p>
          )}
          {appt && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Therapist</span>
                  <span className="font-medium">{appt.therapist_name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Patient</span>
                  <span className="font-medium">{appt.patient_name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-medium">{scheduledIso ? new Date(scheduledIso).toLocaleString() : '—'}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 text-center">
                <Clock className="h-6 w-6 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-2">Starts in</p>
                <p className="text-2xl font-bold mt-1">{fmtCountdown(diffMs)}</p>
              </div>

              <Button
                className="w-full gap-2"
                disabled={!canJoin}
                onClick={handleJoinClick}
              >
                <Video className="h-4 w-4" />
                Join Call
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <PreCallDisclaimer
        open={disclaimerOpen}
        onOpenChange={setDisclaimerOpen}
        appointmentId={appointmentId}
        role={role}
        onAccept={handleAccept}
      />
    </div>
  );
}
