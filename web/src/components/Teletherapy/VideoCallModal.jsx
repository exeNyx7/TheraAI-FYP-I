import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, Maximize2, MessageSquare, X } from 'lucide-react';

export function VideoCallModal({ isOpen, onClose, patientName, therapistName }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    if (!isOpen) { setCallDuration(0); setIsConnecting(true); return; }
    const connectTimer = setTimeout(() => setIsConnecting(false), 2000);
    return () => clearTimeout(connectTimer);
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Main video area */}
      <div className="flex-1 relative bg-gray-900">
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
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            variant={isVideoOff ? 'destructive' : 'secondary'}
            className="h-12 w-12 rounded-full"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-14 w-14 rounded-full"
            onClick={onClose}
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
