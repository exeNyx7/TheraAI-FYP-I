import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, Maximize2, MessageSquare, X } from 'lucide-react';
import InCallNotes from '../Call/InCallNotes';

const JITSI_SCRIPT_SRC = 'https://meet.jit.si/external_api.js';

function loadJitsiScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI);
    const existing = document.querySelector(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.JitsiMeetExternalAPI));
      existing.addEventListener('error', () => reject(new Error('jitsi load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.JitsiMeetExternalAPI);
    script.onerror = () => reject(new Error('jitsi load failed'));
    document.body.appendChild(script);
  });
}

export function VideoCallModal({
  isOpen,
  onClose,
  patientName,
  therapistName,
  appointmentId,
  role,
  patientId,
}) {
  const navigate = useNavigate();
  const isTherapist = role === 'therapist' || role === 'psychiatrist' || role === 'admin';
  const roomName = appointmentId ? `theraai-${appointmentId}` : undefined;
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [jitsiError, setJitsiError] = useState(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    if (!isOpen) { setCallDuration(0); setIsConnecting(true); return; }
    const connectTimer = setTimeout(() => setIsConnecting(false), 2000);
    return () => clearTimeout(connectTimer);
  }, [isOpen]);

  // Jitsi External API lifecycle
  useEffect(() => {
    if (!isOpen || !roomName) return;
    let disposed = false;
    setJitsiError(null);
    loadJitsiScript()
      .then((JitsiMeetExternalAPI) => {
        if (disposed || !jitsiContainerRef.current || !JitsiMeetExternalAPI) return;
        try {
          const displayName = isTherapist ? (therapistName || 'Therapist') : (patientName || 'Patient');
          const api = new JitsiMeetExternalAPI('meet.jit.si', {
            roomName,
            parentNode: jitsiContainerRef.current,
            width: '100%',
            height: '100%',
            userInfo: { displayName },
            configOverwrite: {
              prejoinPageEnabled: false,
              disableDeepLinking: true,
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
            },
          });
          jitsiApiRef.current = api;
          api.addListener?.('videoConferenceJoined', () => setIsConnecting(false));
          api.addListener?.('readyToClose', () => handleEndCall());
        } catch (e) {
          setJitsiError('Failed to start video call');
        }
      })
      .catch(() => setJitsiError('Failed to load video call'));
    return () => {
      disposed = true;
      try {
        jitsiApiRef.current?.dispose?.();
      } catch (_) { /* ignore */ }
      jitsiApiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomName]);

  useEffect(() => {
    if (!isOpen || isConnecting) return;
    const interval = setInterval(() => setCallDuration(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen, isConnecting]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (appointmentId) {
      if (isTherapist) {
        navigate(`/call/${appointmentId}/post-therapist`);
        return;
      }
      if (role === 'patient') {
        navigate(`/call/${appointmentId}/post-patient`);
        return;
      }
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {isTherapist && appointmentId && (
        <InCallNotes appointmentId={appointmentId} patientId={patientId} />
      )}
      {roomName && (
        <div className="absolute top-4 left-4 z-[60] text-xs text-white/60">Room: {roomName}</div>
      )}
      {/* Main video area */}
      <div className="flex-1 relative bg-gray-900">
        {/* Jitsi iframe container */}
        <div ref={jitsiContainerRef} className="absolute inset-0" />
        {jitsiError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-destructive/90 text-white text-sm px-3 py-1 rounded-full z-[60]">
            {jitsiError}
          </div>
        )}
        {isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Video className="h-12 w-12 text-primary" />
            </div>
            <p className="text-white text-xl font-semibold">Connecting to {patientName}...</p>
          </div>
        ) : (
          <>
            {/* Remote video placeholder */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center text-5xl font-bold text-white">
                {patientName?.[0] || 'P'}
              </div>
            </div>

            {/* Call duration */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
              {formatDuration(callDuration)}
            </div>

            {/* Self-view */}
            <div className="absolute bottom-24 right-4 w-32 h-24 bg-gray-700 rounded-xl border-2 border-white/20 overflow-hidden flex items-center justify-center">
              {isVideoOff ? (
                <VideoOff className="h-8 w-8 text-gray-400" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center text-white font-bold text-xl">
                  {therapistName?.[0] || 'T'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="text-white text-sm">
          {isConnecting ? 'Connecting...' : patientName}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant={isMuted ? 'destructive' : 'secondary'}
            className="h-12 w-12 rounded-full"
            onClick={() => {
              try { jitsiApiRef.current?.executeCommand?.('toggleAudio'); } catch (_) { /* ignore */ }
              setIsMuted(!isMuted);
            }}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            variant={isVideoOff ? 'destructive' : 'secondary'}
            className="h-12 w-12 rounded-full"
            onClick={() => {
              try { jitsiApiRef.current?.executeCommand?.('toggleVideo'); } catch (_) { /* ignore */ }
              setIsVideoOff(!isVideoOff);
            }}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-14 w-14 rounded-full"
            onClick={handleEndCall}
          >
            <Phone className="h-6 w-6 rotate-[135deg]" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="icon" variant="ghost" className="text-white h-10 w-10">
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white h-10 w-10">
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
