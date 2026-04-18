import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

export function VoiceInput({ onVoiceInput, onTranscriptChange, onListeningChange }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const latestTranscriptRef = useRef('');
  const shouldKeepListeningRef = useRef(false);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSupported(true);
    }
  }, []);

  const startListening = () => {
    if (!supported || isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    shouldKeepListeningRef.current = true;
    setTranscript('');

    recognition.onstart = () => {
      setIsListening(true);
      onListeningChange?.(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = finalTranscriptRef.current;
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      finalTranscriptRef.current = finalTranscript;
      const combined = `${finalTranscript} ${interimTranscript}`.trim();
      latestTranscriptRef.current = combined;
      setTranscript(combined);
      onTranscriptChange?.(combined);
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try { recognition.start(); return; } catch { shouldKeepListeningRef.current = false; }
      }
      setIsListening(false);
      onListeningChange?.(false);
      const spoken = finalTranscriptRef.current.trim() || latestTranscriptRef.current.trim();
      if (spoken) onVoiceInput?.(spoken);
      setTranscript('');
      finalTranscriptRef.current = '';
      latestTranscriptRef.current = '';
    };

    recognition.onerror = (event) => {
      const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'];
      if (fatal.includes(event?.error)) {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        onListeningChange?.(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      setIsListening(false);
      onListeningChange?.(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        title={isListening ? 'Stop listening' : 'Voice input'}
        className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 border ${
          isListening
            ? 'border-destructive/50 bg-destructive/10 text-destructive'
            : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="h-3.5 w-3.5" />
            Stop
            {/* Pulsing ring */}
            <span className="absolute -inset-0.5 rounded-full border border-destructive/40 animate-ping opacity-60" />
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" />
            Voice
          </>
        )}
      </button>

      {transcript && (
        <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
          "{transcript}"
        </span>
      )}
    </div>
  );
}
