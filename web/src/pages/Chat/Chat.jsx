import { useState, useEffect, useRef, useCallback } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { EscalationModal } from '../../components/Chat/EscalationModal';
import SessionHistoryModal from '../../components/Chat/SessionHistoryModal';
import { VoiceInput } from '../../components/Chat/VoiceInput';
import { Card } from '../../components/ui/card';
import { Send, RotateCcw, Zap, History, AlertTriangle, Phone, Calendar, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { sendChatMessage } from '../../services/chatService';
import { useWebSocketChat } from '../../hooks/useWebSocketChat';
import apiClient from '../../apiClient';

const SUGGESTED = [
  "I'm feeling overwhelmed with work",
  'How can I manage anxiety better?',
  'I had a great day, want to celebrate!',
  "I'm struggling with sleep",
];

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your AI mental wellness companion. I'm here to listen and support you. How are you feeling today?",
};

const CRISIS_CONFIG = {
  emergency: { bg: 'bg-red-500/10 border-red-500/50', icon: 'text-red-500', title: 'Crisis Support Needed', message: "I'm concerned about your safety. Please reach out for immediate help.", hotline: 'Umang: 0317-4288665' },
  high:      { bg: 'bg-orange-500/10 border-orange-500/50', icon: 'text-orange-500', title: "You're Not Alone", message: "I hear you're going through a really hard time. Professional support can help.", hotline: 'Umang: 0317-4288665' },
  moderate:  { bg: 'bg-yellow-500/10 border-yellow-500/50', icon: 'text-yellow-500', title: 'Reach Out for Support', message: "Talking to a therapist might help you work through what you're feeling.", hotline: null },
};

function CrisisBanner({ severity, onBookTherapist, onDismiss }) {
  const c = CRISIS_CONFIG[severity];
  if (!c) return null;
  return (
    <div className={`mx-4 mt-3 p-4 rounded-xl border ${c.bg} flex items-start gap-3`}>
      <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${c.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${c.icon}`}>{c.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{c.message}</p>
        {c.hotline && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">{c.hotline}</span>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 h-8 text-xs rounded-full" onClick={onBookTherapist}>
            <Calendar className="h-3.5 w-3.5" /> Book a Therapist
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground rounded-full" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // ─── Persist messages across navigation via sessionStorage ───────────────────
  const STORAGE_KEY = user ? `theraai_chat_${user.id || user._id}` : null;

  const [messages, setMessages] = useState(() => {
    if (!STORAGE_KEY) return [WELCOME];
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [WELCOME];
    } catch {
      return [WELCOME];
    }
  });

  useEffect(() => {
    if (!STORAGE_KEY) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* storage full */ }
  }, [messages, STORAGE_KEY]);

  const [isLoading, setIsLoading]       = useState(false);
  const [inputValue, setInputValue]     = useState('');
  const [showHistory, setShowHistory]   = useState(false);
  const [crisisState, setCrisisState]   = useState({ visible: false, severity: null });
  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);
  const inputValueRef   = useRef('');
  const voiceBaseRef    = useRef('');

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputValueRef.current = inputValue; }, [inputValue]);

  // ─── WebSocket ────────────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'error') { showError(data.content || 'Something went wrong.'); setIsLoading(false); return; }
    setMessages(prev => [...prev, { id: `${Date.now()}_ai`, role: 'assistant', content: data.content || "I'm here for you." }]);
    setIsLoading(false);
  }, [showError]);

  const handleWsCrisis = useCallback(({ severity }) => {
    if (severity && severity !== 'none') {
      setCrisisState({ visible: true, severity });
    }
  }, []);

  const { sendMessage: wsSend, isTyping, connected: wsConnected } = useWebSocketChat({
    onMessage: handleWsMessage, onCrisis: handleWsCrisis, enabled: !!user,
  });

  useEffect(() => { if (isTyping) setIsLoading(true); }, [isTyping]);

  // ─── Send ─────────────────────────────────────────────────────────────────────
  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return;
    setMessages(prev => [...prev, { id: `${Date.now()}`, role: 'user', content }]);
    setInputValue('');
    setIsLoading(true);

    const sentViaWs = wsSend(content);
    if (sentViaWs) return;

    try {
      const data = await sendChatMessage(content);
      setMessages(prev => [...prev, {
        id: `${Date.now()}_ai`, role: 'assistant',
        content: data.response || "I'm here for you. Could you tell me more?",
      }]);
      if (data.show_book_therapist && data.crisis_severity && data.crisis_severity !== 'none') {
        setCrisisState({ visible: true, severity: data.crisis_severity });
        apiClient.post('/escalations', { severity: data.crisis_severity, message_excerpt: content.slice(0, 300), triggered_by: 'keyword' }).catch(() => {});
      }
    } catch (err) {
      showError(err.response?.data?.detail || 'Could not reach the AI. Please try again.');
      setMessages(prev => [...prev, { id: `${Date.now()}_ai`, role: 'assistant', content: "I'm here to listen. Please tell me more about what you're experiencing." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    setMessages([WELCOME]);
    setCrisisState({ visible: false, severity: null });
    if (STORAGE_KEY) sessionStorage.removeItem(STORAGE_KEY);
    try { await apiClient.delete('/chat/history'); showSuccess('Chat cleared.'); }
    catch { showSuccess('Chat cleared (local only).'); }
  };

  // ─── Voice input helpers ──────────────────────────────────────────────────────
  const mergeVoice = useCallback((spoken) => {
    const base = voiceBaseRef.current;
    const s = (spoken || '').trim();
    if (!s) return base;
    if (!base) return s;
    return /\s$/.test(base) ? `${base}${s}` : `${base} ${s}`;
  }, []);

  const handleVoiceListening = useCallback((listening) => {
    if (listening) voiceBaseRef.current = inputValueRef.current;
    inputRef.current?.focus();
  }, []);

  const handleVoiceTranscript = useCallback((spoken) => setInputValue(mergeVoice(spoken)), [mergeVoice]);
  const handleVoiceInput      = useCallback((spoken) => { setInputValue(mergeVoice(spoken)); inputRef.current?.focus(); }, [mergeVoice]);

  if (!user) return null;

  return (
    <div className="flex bg-background">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background h-[calc(100vh-0px)] md:h-screen flex flex-col">

          {/* ── Header ── */}
          <div className="border-b border-border px-5 py-3.5 flex items-center justify-between bg-card/60 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">Mindful Chat</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {wsConnected
                    ? <span className="flex items-center gap-1 text-[11px] text-emerald-500"><Wifi className="h-3 w-3" />Live</span>
                    : <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><WifiOff className="h-3 w-3" />REST</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowHistory(true)}
                title="Session history"
                className="rounded-xl"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearHistory}
                title="Clear chat"
                className="rounded-xl"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Crisis Banner ── */}
          {crisisState.visible && (
            <CrisisBanner
              severity={crisisState.severity}
              onBookTherapist={() => navigate('/appointments')}
              onDismiss={() => setCrisisState({ visible: false, severity: null })}
            />
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-3">
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">How can I help you today?</h2>
                  <p className="text-sm text-muted-foreground">Choose a topic or type to start</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTED.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-left p-3.5 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-muted/50 text-sm transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ── */}
          <div className="border-t border-border px-5 py-4 bg-card/60 backdrop-blur-sm flex-shrink-0 space-y-3">
            <VoiceInput
              onVoiceInput={handleVoiceInput}
              onTranscriptChange={handleVoiceTranscript}
              onListeningChange={handleVoiceListening}
            />
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type your message…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(inputValue); } }}
                disabled={isLoading}
                className="flex-1 rounded-xl"
              />
              <Button
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="gap-2 bg-primary hover:bg-primary/90 rounded-xl px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Session History Modal ── */}
      <SessionHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={(session) => {
          showSuccess(`Loaded: ${session.title || 'Session'}`);
          setShowHistory(false);
        }}
      />
    </div>
  );
}
