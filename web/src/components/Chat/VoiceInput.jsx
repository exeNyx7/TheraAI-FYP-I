import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export function VoiceInput({ onVoiceInput }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSupported(true);
    }
  }, []);

  const startListening = () => {
    if (!supported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) setTranscript(finalTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript) {
        onVoiceInput(transcript);
        setTranscript('');
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
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
