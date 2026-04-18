import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Phone, ExternalLink, X, Video, Monitor } from 'lucide-react';
import apiClient from '../../apiClient';
import { useAuth } from '../../contexts/AuthContext';

/**
 * VideoCallModal — Jitsi Meet integration.
 *
 * Shows a "Session Ready" screen first so the user can choose:
 *   1. Open in Browser (new tab — reliable, no login issues)
 *   2. Join in App (embedded Jitsi External API)
 *
 * meet.jit.si started requiring sign-in for some embedded sessions (Jan 2025).
 * Opening in a new browser tab bypasses this completely.
 */
export function VideoCallModal({ isOpen, onClose, appointmentId, patientName, therapistName }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const isTherapist = role === 'psychiatrist' || role === 'therapist';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  // 'ready' = show join options, 'embedded' = show Jitsi inline, 'external' = opened in new tab
  const [callMode, setCallMode] = useState('ready');

  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // ── Fetch room from backend ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setCallMode('ready');
      return;
    }
    if (!appointmentId) {
      setError('No appointment ID provided. Please join from the Appointments page.');
      return;
    }
    fetchRoom();
  }, [isOpen, appointmentId]);

  const fetchRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/calls/room', { appointment_id: appointmentId });
      const jitsiUrl = res.data.jitsi_url;
      const url = new URL(jitsiUrl);
      const domain = url.hostname;
      const roomName = url.pathname.replace(/^\//, '');
      setRoomData({ roomName, jitsiUrl, domain });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create video room.');
    } finally {
      setLoading(false);
    }
  };

  // ── Load Jitsi External API only when user chooses embedded mode ──────────
  useEffect(() => {
    if (callMode !== 'embedded' || !roomData || !isOpen) return;

    const domain = roomData.domain;
    const scriptSrc = `https://${domain}/external_api.js`;
    const scriptId = 'jitsi-external-api-script';

    const initMeeting = () => {
      setTimeout(() => createMeeting(domain, roomData.roomName), 100);
    };

    const existing = document.getElementById(scriptId);
    if (existing && window.JitsiMeetExternalAPI) {
      initMeeting();
      return;
    }
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = scriptSrc;
    script.async = true;
    script.onload = initMeeting;
    script.onerror = () => {
      setError('Failed to load Jitsi API. Please use "Open in Browser" instead.');
      setCallMode('ready');
    };
    document.head.appendChild(script);
  }, [callMode, roomData, isOpen]);

  const createMeeting = useCallback((domain, roomName) => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }

    const displayName = isTherapist
      ? `Dr. ${therapistName || user?.full_name || 'Therapist'}`
      : (patientName || user?.full_name || 'Patient');

    try {
      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableNoisyMicDetection: false,
          enableUserRolesBasedOnToken: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'closedcaptions', 'desktop', 'hangup', 'chat', 'settings', 'fullscreen'],
        },
        userInfo: { displayName },
      });
      api.addEventListener('videoConferenceLeft', handleEndCall);
      api.addEventListener('readyToClose', handleEndCall);
      jitsiApiRef.current = api;
    } catch (err) {
      console.error('Jitsi External API init failed:', err);
      setError('Could not start in-app video. Please use "Open in Browser".');
      setCallMode('ready');
    }
  }, [patientName, therapistName, isTherapist, user]);

  const cleanup = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }
    setRoomData(null);
    setError(null);
    setLoading(false);
    setCallMode('ready');
  };

  const openInNewTab = () => {
    if (roomData?.jitsiUrl) {
      window.open(roomData.jitsiUrl, '_blank');
      setCallMode('external');
    }
  };

  const handleEndCall = () => {
    cleanup();
    if (appointmentId) {
      if (isTherapist) {
        navigate(`/call/${appointmentId}/post-therapist`);
        if (onClose) onClose();
        return;
      }
      if (role === 'patient') {
        navigate(`/call/${appointmentId}/post-patient`);
        if (onClose) onClose();
        return;
      }
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : error ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
          <span className="text-white font-medium text-sm">
            {loading ? 'Connecting...' : error ? 'Connection Failed' : `Session with ${patientName || therapistName || 'Participant'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {callMode === 'embedded' && roomData?.jitsiUrl && (
            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white gap-1.5 text-xs h-8" onClick={openInNewTab}>
              <ExternalLink className="h-3.5 w-3.5" /> Open in Browser
            </Button>
          )}
          <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={handleEndCall} title="End call">
            <Phone className="h-4 w-4 rotate-[135deg]" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 relative bg-gray-950">
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-white text-lg">Setting up your session...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center z-10">
            <X className="h-16 w-16 text-red-400" />
            <p className="text-white text-lg font-semibold">Could not start video call</p>
            <p className="text-gray-400 text-sm max-w-md">{error}</p>
            {roomData?.jitsiUrl && (
              <Button onClick={openInNewTab} className="gap-2 bg-primary hover:bg-primary/90 text-white">
                <ExternalLink className="h-4 w-4" /> Open in Browser
              </Button>
            )}
            <Button variant="outline" onClick={handleEndCall} className="text-white border-white/20 hover:bg-white/10">
              Close
            </Button>
          </div>
        )}

        {/* Session Ready — choose how to join */}
        {!loading && !error && roomData && callMode === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 z-10">
            <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Video className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">Session Ready</p>
              <p className="text-gray-400 mt-2 text-sm">
                Your session with <span className="text-white font-medium">{isTherapist ? (patientName || 'Patient') : (therapistName || 'Therapist')}</span> is ready to begin.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                onClick={openInNewTab}
                className="gap-2 bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold"
              >
                <ExternalLink className="h-5 w-5" />
                Open in Browser
                <span className="text-xs font-normal opacity-75 ml-1">recommended</span>
              </Button>
              <Button
                onClick={() => setCallMode('embedded')}
                variant="outline"
                className="gap-2 border-white/20 text-white hover:bg-white/10 h-10"
              >
                <Monitor className="h-4 w-4" />
                Join in App
              </Button>
            </div>
            <p className="text-gray-500 text-xs text-center max-w-xs">
              "Open in Browser" is recommended — it avoids sign-in prompts and works on all devices.
            </p>
          </div>
        )}

        {/* External mode — user already opened in new tab */}
        {!loading && !error && roomData && callMode === 'external' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 z-10">
            <div className="h-20 w-20 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <ExternalLink className="h-10 w-10 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold">Session Opened</p>
              <p className="text-gray-400 mt-2 text-sm">
                Your session is running in a separate browser tab.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={openInNewTab} className="gap-2 bg-primary/80 hover:bg-primary/90 text-white h-10">
                <ExternalLink className="h-4 w-4" /> Reopen Tab
              </Button>
              <Button
                onClick={handleEndCall}
                variant="outline"
                className="gap-2 border-white/20 text-white hover:bg-white/10 h-10"
              >
                <Phone className="h-4 w-4 rotate-[135deg]" /> End Session
              </Button>
            </div>
          </div>
        )}

        {/* Embedded Jitsi */}
        <div
          ref={jitsiContainerRef}
          style={{ width: '100%', height: '100%', display: callMode === 'embedded' ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}
