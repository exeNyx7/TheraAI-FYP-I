import { useState, useEffect, useRef, useCallback } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MessageBubble } from '../../components/Chat/MessageBubble';
import { VoiceInput } from '../../components/Chat/VoiceInput';
import { SessionHistory } from '../../components/Chat/SessionHistory';
import { Card } from '../../components/ui/card';
import { Send, RotateCcw, Zap, History, X, AlertTriangle, Phone, Calendar, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { sendChatMessage } from '../../services/chatService';
import { useWebSocketChat } from '../../hooks/useWebSocketChat';
import apiClient from '../../apiClient';

const suggestedPrompts = [
  "I'm feeling overwhelmed with work",
  'How can I manage anxiety better?',
  'I had a great day, want to celebrate!',
  "I'm struggling with sleep",
];

const systemWelcome = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your AI mental wellness companion. I'm here to listen and support you. How are you feeling today?",
};

const CRISIS_SEVERITY_CONFIG = {
  emergency: {
    bg: 'bg-red-500/10 border-red-500/50',
    icon: 'text-red-500',
    title: 'Crisis Support Needed',
    message: "I'm concerned about your safety. Please reach out for immediate help.",
    hotline: 'Umang: 0317-4288665',
  },
  high: {
    bg: 'bg-orange-500/10 border-orange-500/50',
    icon: 'text-orange-500',
    title: 'You\'re Not Alone',
    message: "I hear you're going through a really hard time. Professional support can help.",
    hotline: 'Umang: 0317-4288665',
  },
  moderate: {
    bg: 'bg-yellow-500/10 border-yellow-500/50',
    icon: 'text-yellow-500',
    title: 'Reach Out for Support',
    message: "Talking to a therapist might help you work through what you're feeling.",
    hotline: null,
  },
};

function CrisisBanner({ severity, onBookTherapist, onDismiss }) {
  const config = CRISIS_SEVERITY_CONFIG[severity];
  if (!config) return null;

  return (
    <div className={`mx-6 mt-3 p-4 rounded-xl border ${config.bg} flex items-start gap-3`}>
      <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.icon}`}>{config.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.message}</p>
        {config.hotline && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">{config.hotline}</span>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 h-8 text-xs" onClick={onBookTherapist}>
            <Calendar className="h-3.5 w-3.5" /> Book a Therapist
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState([systemWelcome]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [crisisState, setCrisisState] = useState({ visible: false, severity: null });
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const inputValueRef = useRef('');
  const voiceBaseTextRef = useRef('');

  // WebSocket handler — called with parsed assistant message from WS
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'error') {
      showError(data.content || 'Something went wrong.');
      setIsLoading(false);
      return;
    }
    const aiMsg = {
      id: Date.now().toString() + '_ai',
      role: 'assistant',
      content: data.content || "I'm here for you.",
      sentiment: data.sentiment,
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  }, [showError]);

  const handleWsCrisis = useCallback(({ severity }) => {
    setCrisisState({ visible: true, severity });
  }, []);

  const { sendMessage: wsSend, isTyping, connected: wsConnected } = useWebSocketChat({
    onMessage: handleWsMessage,
    onCrisis: handleWsCrisis,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    // Show typing indicator from WS
    if (isTyping) setIsLoading(true);
  }, [isTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Try WebSocket first; fall back to REST if not connected
    const sentViaWs = wsSend(content);
    if (sentViaWs) return; // WS will call handleWsMessage when response arrives

    // REST fallback
    try {
      const data = await sendChatMessage(content);
      const aiMsg = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.response || "I'm here for you. Could you tell me more?",
        sentiment: data.sentiment,
      };
      setMessages(prev => [...prev, aiMsg]);
      if (data.show_book_therapist && data.crisis_severity && data.crisis_severity !== 'none') {
        setCrisisState({ visible: true, severity: data.crisis_severity });
      }
    } catch (err) {
      showError(err.response?.data?.detail || 'Could not reach the AI. Please try again.');
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: "I'm here to listen. Please tell me more about what you're experiencing.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    // Clear local state immediately so UI responds fast
    setMessages([systemWelcome]);
    setCrisisState({ visible: false, severity: null });
    // Also wipe DB history so old garbled BlenderBot entries no longer
    // contaminate Llama's conversation context on next message
    try {
      await apiClient.delete('/chat/history');
      showSuccess('Chat history cleared.');
    } catch {
      showSuccess('Chat cleared (local only — server clear failed).');
    }
  };

  const mergeVoiceWithBaseInput = useCallback((spokenText) => {
    const baseText = voiceBaseTextRef.current;
    const cleanedSpokenText = (spokenText || '').trim();
    if (!cleanedSpokenText) return baseText;
    if (!baseText) return cleanedSpokenText;
    return /\s$/.test(baseText) ? `${baseText}${cleanedSpokenText}` : `${baseText} ${cleanedSpokenText}`;
  }, []);

  const handleVoiceListeningChange = useCallback((listening) => {
    if (listening) {
      voiceBaseTextRef.current = inputValueRef.current;
    }
    chatInputRef.current?.focus();
  }, []);

  const handleVoiceTranscript = useCallback((spokenText) => {
    setInputValue(mergeVoiceWithBaseInput(spokenText));
  }, [mergeVoiceWithBaseInput]);

  const handleVoiceInput = useCallback((spokenText) => {
    setInputValue(mergeVoiceWithBaseInput(spokenText));
    chatInputRef.current?.focus();
  }, [mergeVoiceWithBaseInput]);

  if (!user) return null;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background h-[calc(100vh-0px)] flex flex-col lg:flex-row">
          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-bold font-sans">Mindful Chat</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Talk with your AI companion</p>
                  {wsConnected
                    ? <span className="flex items-center gap-1 text-xs text-green-500"><Wifi className="h-3 w-3" /> Live</span>
                    : <span className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="h-3 w-3" /> REST</span>
                  }
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-2 bg-transparent lg:hidden">
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={clearHistory} className="gap-2 bg-transparent">
                  <RotateCcw className="h-4 w-4" /> Clear
                </Button>
              </div>
            </div>

            {/* Crisis Banner */}
            {crisisState.visible && (
              <CrisisBanner
                severity={crisisState.severity}
                onBookTherapist={() => navigate('/appointments')}
                onDismiss={() => setCrisisState({ visible: false, severity: null })}
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
              {messages.length === 1 && !isLoading && (
                <div className="space-y-4 mt-12">
                  <div className="text-center mb-8">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                    <p className="text-muted-foreground">Choose a topic or start typing to begin our conversation</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {suggestedPrompts.map((prompt) => (
                      <Card
                        key={prompt}
                        className="p-4 hover:shadow-md transition-all cursor-pointer border-border/50 hover:border-primary/50 bg-card/50 hover:bg-card"
                        onClick={() => sendMessage(prompt)}
                      >
                        <p className="text-sm font-medium">{prompt}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="flex justify-start gap-3">
                  <div className="bg-muted rounded-lg px-4 py-3 border border-border">
                    <div className="flex gap-2">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-border px-6 py-4 bg-card/50 backdrop-blur-sm space-y-3">
              <VoiceInput
                onVoiceInput={handleVoiceInput}
                onTranscriptChange={handleVoiceTranscript}
                onListeningChange={handleVoiceListeningChange}
              />
              <div className="flex gap-2">
                <Input
                  ref={chatInputRef}
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage(inputValue);
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={() => sendMessage(inputValue)} disabled={isLoading || !inputValue.trim()} className="gap-2 bg-primary hover:bg-primary/90">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Session History Sidebar */}
          <div className="hidden lg:flex flex-col w-80 border-l border-border bg-card/30 overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50">
              <h3 className="font-semibold">Therapy Sessions</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <SessionHistory onSelectSession={(session) => {
                // Future: load conversation messages
                showSuccess(`Loaded: ${session.title}`);
              }} />
            </div>
          </div>

          {/* Mobile Session History overlay */}
          {showHistory && (
            <div className="lg:hidden fixed inset-0 z-40 bg-background flex flex-col">
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold">Therapy Sessions</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <SessionHistory onSelectSession={(session) => {
                  setShowHistory(false);
                  showSuccess(`Loaded: ${session.title}`);
                }} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
