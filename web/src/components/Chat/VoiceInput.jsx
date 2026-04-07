import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';

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
      const combinedTranscript = `${finalTranscript} ${interimTranscript}`.trim();
      latestTranscriptRef.current = combinedTranscript;
      setTranscript(combinedTranscript);
      onTranscriptChange?.(combinedTranscript);
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          shouldKeepListeningRef.current = false;
        }
      }

      setIsListening(false);
      onListeningChange?.(false);
      const spokenText = finalTranscriptRef.current.trim() || latestTranscriptRef.current.trim();
      if (spokenText) {
        onVoiceInput?.(spokenText);
      }
      setTranscript('');
      finalTranscriptRef.current = '';
      latestTranscriptRef.current = '';
    };

    recognition.onerror = (event) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed' || event?.error === 'audio-capture') {
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
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={isListening ? 'destructive' : 'outline'}
        size="sm"
        onClick={isListening ? stopListening : startListening}
        className={`gap-2 transition-all duration-300 ${isListening ? 'animate-pulse' : ''}`}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4" />
            Stop
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Voice
          </>
        )}
      </Button>
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Volume2 className="h-4 w-4 text-destructive" />
          Listening...
        </div>
      )}
      {transcript && !isListening && (
        <p className="text-xs text-muted-foreground truncate max-w-xs">{transcript}</p>
      )}
    </div>
  );
}
