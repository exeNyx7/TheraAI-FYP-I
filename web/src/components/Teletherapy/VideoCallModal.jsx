import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Phone, ExternalLink, X } from 'lucide-react';
import apiClient from '../../apiClient';
import { useAuth } from '../../contexts/AuthContext';

/**
 * VideoCallModal — Jitsi Meet integration via External API.
 *
 * Uses the Jitsi Meet External API (JS SDK) instead of a raw iframe src URL.
 * This approach bypasses the meet.jit.si sign-in page that appears when the
 * iframe URL is loaded directly (meet.jit.si started requiring auth Jan 2025).
 *
 * The External API creates a peer connection directly from JavaScript, so the
 * browser-level sign-in web page is never loaded.
 *
 * Props:
 *   isOpen         boolean — controls visibility
 *   onClose        fn      — called when user ends call
 *   appointmentId  string  — used to fetch/create the Jitsi room
 *   patientName    string  — participant display name
 *   therapistName  string  — participant display name
 */
export function VideoCallModal({ isOpen, onClose, appointmentId, patientName, therapistName }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const isTherapist = role === 'psychiatrist';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null); // { roomName, jitsiUrl, domain }

  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // ── Fetch room from backend ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }
    if (!appointmentId) {
      setError('No appointment ID provided.');
      return;
    }
    fetchRoom();
  }, [isOpen, appointmentId]);

  const fetchRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/calls/room', { appointment_id: appointmentId });
      const jitsiUrl = res.data.jitsi_url; // e.g. "https://meet.jit.si/theraai-<id>"
      // Extract domain and room name from URL
      const url = new URL(jitsiUrl);
      const domain = url.hostname; // "meet.jit.si"
      const roomName = url.pathname.replace(/^\//, ''); // "theraai-<id>"
      setRoomData({ roomName, jitsiUrl, domain });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create video room.');
      setLoading(false);
    }
  };

  // ── Load Jitsi External API script then init meeting ─────────────────────
  useEffect(() => {
    if (!roomData || !isOpen) return;

    const domain = roomData.domain;
    const scriptSrc = `https://${domain}/external_api.js`;
    const scriptId = 'jitsi-external-api-script';

    const initMeeting = () => {
      // Small delay to ensure the container div is rendered
      setTimeout(() => createMeeting(domain, roomData.roomName), 100);
    };

    const existing = document.getElementById(scriptId);
    if (existing && window.JitsiMeetExternalAPI) {
      initMeeting();
      return;
    }
    // Remove any stale script with a different domain
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = scriptSrc;
    script.async = true;
    script.onload = initMeeting;
    script.onerror = () => {
      setError('Failed to load Jitsi API. Check your internet connection.');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, [roomData, isOpen]);

  // ── Create the actual JitsiMeetExternalAPI instance ───────────────────────
  const createMeeting = useCallback((domain, roomName) => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

    // Dispose any previous instance
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }

    const displayName = patientName || therapistName || 'User';

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
          // Disable any features that trigger auth redirects
          enableUserRolesBasedOnToken: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'hangup', 'chat', 'settings', 'fullscreen',
          ],
        },
        userInfo: { displayName },
      });

      api.addEventListener('videoConferenceLeft', handleEndCall);
      api.addEventListener('readyToClose', handleEndCall);
      jitsiApiRef.current = api;
      setLoading(false);
    } catch (err) {
      console.error('Jitsi External API init failed:', err);
      setError('Could not start video call. Try opening in a new tab.');
      setLoading(false);
    }
  }, [patientName, therapistName]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }
    setRoomData(null);
    setError(null);
    setLoading(false);
  };

  const openInNewTab = () => {
    if (roomData?.jitsiUrl) window.open(roomData.jitsiUrl, '_blank');
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

  const sessionLabel = loading
    ? 'Connecting...'
    : error
    ? 'Connection Failed'
    : `Session with ${patientName || therapistName || 'Participant'}`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`h-2 w-2 rounded-full ${
              loading
                ? 'bg-yellow-400 animate-pulse'
                : error
                ? 'bg-red-400'
                : 'bg-green-400 animate-pulse'
            }`}
          />
          <span className="text-white font-medium text-sm">{sessionLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Always show "Open in new tab" as a fallback */}
          {roomData?.jitsiUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="text-white h-8 w-8"
              onClick={openInNewTab}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8 rounded-full"
            onClick={handleEndCall}
            title="End call"
          >
            <Phone className="h-4 w-4 rotate-[135deg]" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 relative bg-gray-950">
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-white text-lg">Setting up your session...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center z-10">
            <X className="h-16 w-16 text-red-400" />
            <p className="text-white text-lg font-semibold">Could not start video call</p>
            <p className="text-gray-400 text-sm max-w-md">{error}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {roomData?.jitsiUrl && (
                <Button
                  onClick={openInNewTab}
                  className="gap-2 bg-primary hover:bg-primary/90 text-white"
                >
                  <ExternalLink className="h-4 w-4" /> Open in New Tab
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleEndCall}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/*
          Jitsi External API renders INTO this div.
          Keep it mounted even during loading so the ref is available when
          createMeeting() is called via the script.onload callback.
        */}
        <div
          ref={jitsiContainerRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
