import { useState, useEffect, useRef, useCallback } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MessageBubble } from '../../components/Chat/MessageBubble';
import { EscalationModal } from '../../components/Chat/EscalationModal';
import SessionHistoryModal from '../../components/Chat/SessionHistoryModal';
import { Card } from '../../components/ui/card';
import { Send, RotateCcw, Zap, History, Mic } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

const CURRENT_CONV_KEY = 'theraai:current_conversation_id';

const suggestedPrompts = [
  "I'm feeling overwhelmed with work",
  'How can I manage anxiety better?',
  'I had a great day, want to celebrate!',
  "I'm struggling with sleep",
];

const systemWelcome = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your AI mental wellness companion. I'm here to listen and support you. How are you feeling today?",
};

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState([systemWelcome]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount so conversation persists across navigation
  const loadHistory = useCallback(async () => {
    try {
      const res = await apiClient.get('/chat/history', { params: { limit: 30 } });
      const items = res.data?.messages || [];
      if (!items.length) {
        setMessages([systemWelcome]);
        return;
      }
      // API returns newest-first; reverse for chronological rendering
      const ordered = [...items].reverse();
      const restored = [];
      ordered.forEach((m) => {
        restored.push({ id: `${m.id}_u`, role: 'user', content: m.user_message });
        restored.push({ id: `${m.id}_a`, role: 'assistant', content: m.ai_response });
      });
      setMessages([systemWelcome, ...restored]);
    } catch {
      setMessages([systemWelcome]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const savedId = localStorage.getItem(CURRENT_CONV_KEY);
    // Global /chat/history is per-user; savedId is informational for now.
    void savedId;
    loadHistory();
  }, [user, loadHistory]);

  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    try {
      const res = await apiClient.post('/chat/message', { message: content });
      const data = res.data || {};
      const aiMsg = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.response || "I'm here for you. Could you tell me more?",
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.crisis_detected) setShowEscalation(true);
    } catch {
      const aiMsg = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: "I'm here to listen. Please tell me more about what you're experiencing.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await apiClient.delete('/chat/history');
      localStorage.removeItem(CURRENT_CONV_KEY);
      setMessages([systemWelcome]);
      showSuccess('Chat history cleared.');
    } catch {
      setMessages([systemWelcome]);
      showError?.('Could not clear history on server, cleared locally.');
    }
  };

  const handleSelectConversation = async (conv) => {
    if (!conv?.id) return;
    localStorage.setItem(CURRENT_CONV_KEY, conv.id);
    try {
      const res = await apiClient.get(`/conversations/${conv.id}/messages`);
      const msgs = res.data?.messages || [];
      if (msgs.length) {
        const mapped = msgs.map((m) => ({
          id: m.id,
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));
        setMessages([systemWelcome, ...mapped]);
        return;
      }
    } catch {
      /* fall through to global history */
    }
    loadHistory();
  };

  const toggleMic = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showError?.('Voice input not supported in this browser.');
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || '';
      if (transcript) sendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  if (!user) return null;

  return (
    <div className="flex">
      <EscalationModal open={showEscalation} onOpenChange={setShowEscalation} />
      <SessionHistoryModal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelect={handleSelectConversation}
      />
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background h-[calc(100vh-0px)] flex flex-col">
          {/* Header */}
          <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/40 backdrop-blur-sm">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Mindful Chat
              </h1>
              <p className="text-sm text-muted-foreground">Talk with your AI companion</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(true)}
                className="gap-2 rounded-full"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="gap-2 rounded-full"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-2">
              {messages.length === 1 && !isLoading && (
                <div className="space-y-4 mt-8">
                  <div className="text-center mb-8">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                    <p className="text-muted-foreground">
                      Choose a topic or start typing to begin our conversation
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {suggestedPrompts.map((prompt) => (
                      <Card
                        key={prompt}
                        className="p-4 rounded-2xl hover:shadow-md transition-all cursor-pointer border-border/40 hover:border-primary/50 bg-card/50 hover:bg-card"
                        onClick={() => sendMessage(prompt)}
                      >
                        <p className="text-sm font-medium">{prompt}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div
                          key={i}
                          className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: `${d}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-border px-4 sm:px-6 py-4 bg-card/40 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <Button
                onClick={toggleMic}
                size="icon"
                className={`h-12 w-12 rounded-full shrink-0 shadow-md transition-all ${
                  isListening
                    ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                aria-label="Voice input"
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                disabled={isLoading}
                className="flex-1 rounded-full px-5 h-12 bg-background border-border/60"
              />
              <Button
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="h-12 w-12 rounded-full shrink-0 bg-primary hover:bg-primary/90 shadow-md"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
