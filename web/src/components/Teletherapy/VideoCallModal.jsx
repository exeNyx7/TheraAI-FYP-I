import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Phone, X, Maximize2, Minimize2 } from 'lucide-react';
import apiClient from '../../apiClient';

/**
 * VideoCallModal — Jitsi Meet integration.
 *
 * Props:
 *   isOpen         boolean — controls visibility
 *   onClose        fn      — called when user ends call
 *   appointmentId  string  — used to fetch/create the Jitsi room
 *   patientName    string  — displayed while loading
 *   therapistName  string  — displayed while loading
 */
export function VideoCallModal({ isOpen, onClose, appointmentId, patientName, therapistName }) {
  const [jitsiUrl, setJitsiUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);

  // Fetch room URL whenever modal opens with a valid appointmentId
  useEffect(() => {
    if (!isOpen) {
      setJitsiUrl(null);
      setError(null);
      return;
    }

    if (!appointmentId) {
      setError('No appointment ID provided.');
      return;
    }

    const fetchRoom = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post('/calls/room', { appointment_id: appointmentId });
        setJitsiUrl(res.data.jitsi_url);
      } catch (err) {
        const msg = err?.response?.data?.detail || 'Failed to create video room.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [isOpen, appointmentId]);

  const handleEndCall = () => {
    setJitsiUrl(null);
    onClose();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      iframeRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  // Build Jitsi URL with config to disable prejoin screen
  const iframeSrc = jitsiUrl
    ? `${jitsiUrl}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName=${encodeURIComponent(patientName || therapistName || 'User')}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-medium text-sm">
            {loading ? 'Connecting...' : error ? 'Connection Failed' : `Session with ${patientName || therapistName || 'Participant'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="text-white h-8 w-8"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
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

      {/* Main content area */}
      <div className="flex-1 relative bg-gray-950">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-white text-lg">Setting up your session...</p>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <X className="h-16 w-16 text-red-400" />
            <p className="text-white text-lg font-semibold">Could not start video call</p>
            <p className="text-gray-400 text-sm max-w-md">{error}</p>
            <Button variant="outline" onClick={handleEndCall} className="text-white border-white/20 hover:bg-white/10">
              Close
            </Button>
          </div>
        )}

        {iframeSrc && !loading && !error && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="TheraAI Video Session"
          />
        )}
      </div>
    </div>
  );
}
