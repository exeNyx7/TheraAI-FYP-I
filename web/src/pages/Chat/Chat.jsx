import { useState, useEffect, useRef } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MessageBubble } from '../../components/Chat/MessageBubble';
import { VoiceInput } from '../../components/Chat/VoiceInput';
import { SessionHistory } from '../../components/Chat/SessionHistory';
import { Card } from '../../components/ui/card';
import { Send, RotateCcw, Zap, History, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';


const suggestedPrompts = [
  "I'm feeling overwhelmed with work",
  'How can I manage anxiety better?',
  'I had a great day, want to celebrate!',
  "I'm struggling with sleep",
];

const systemWelcome = { id: 'welcome', role: 'assistant', content: "Hello! I'm your AI mental wellness companion. I'm here to listen and support you. How are you feeling today?" };

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState([systemWelcome]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    try {
      const token = localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token');      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const resp = await fetch(`${API_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content }),
      });
      const data = await resp.json();
      const aiMsg = { id: Date.now().toString() + '_ai', role: 'assistant', content: data.response || "I'm here for you. Could you tell me more?" };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const aiMsg = { id: Date.now().toString() + '_ai', role: 'assistant', content: "I'm here to listen. Please tell me more about what you're experiencing." };
      setMessages(prev => [...prev, aiMsg]);

    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([systemWelcome]);
    showSuccess('Chat history cleared.');
  };

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background h-[calc(100vh-0px)] flex flex-col lg:flex-row">
          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>Mindful Chat</h1>
                <p className="text-sm text-muted-foreground">Talk with your AI companion</p>
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
              <VoiceInput onVoiceInput={sendMessage} />
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
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
          <div className={`hidden lg:flex flex-col w-80 border-l border-border bg-card/30 overflow-hidden`}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50">
              <h3 className="font-semibold">Therapy Sessions</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <SessionHistory />
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
                <SessionHistory />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
