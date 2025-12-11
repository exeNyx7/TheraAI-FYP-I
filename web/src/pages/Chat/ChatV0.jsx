import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Send, RotateCcw, Zap, Loader2 } from 'lucide-react';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../../services/chatService';
import { useToast } from '../../contexts/ToastContext';

const suggestedPrompts = [
  "I'm feeling overwhelmed with work",
  "How can I manage anxiety better?",
  "I had a great day, want to celebrate",
  "I'm struggling with sleep",
];

// Message Bubble Component
const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user';

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <div className={`flex gap-3 animate-in fade-in-up duration-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md rounded-lg px-4 py-3 space-y-1 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none border border-border'
        }`}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs opacity-70 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default function ChatV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Check auth
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Load chat history
    loadChatHistory();
  }, [user, navigate]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setIsFetchingHistory(true);
      const historyResponse = await getChatHistory(50);
      
      // Backend returns {messages: [...], total: n}
      const historyMessages = historyResponse.messages || historyResponse || [];
      
      if (historyMessages.length > 0) {
        // Convert backend format to frontend format
        const formattedMessages = [];
        historyMessages.forEach(msg => {
          // Add user message
          formattedMessages.push({
            id: `user-${msg.id}`,
            content: msg.user_message,
            sender: 'user',
            timestamp: msg.timestamp
          });
          // Add AI response
          formattedMessages.push({
            id: `ai-${msg.id}`,
            content: msg.ai_response,
            sender: 'ai',
            timestamp: msg.timestamp,
            sentiment: msg.sentiment
          });
        });
        setMessages(formattedMessages);
      } else {
        // Show welcome message if no history
        setMessages([{
          id: 'welcome',
          content: "Hello, I'm your AI mental health companion. I'm here to provide professional, empathetic support as you navigate your thoughts and feelings. While I'm not a replacement for a licensed therapist, I can offer a safe space to talk, active listening, and evidence-based guidance. How can I support you today?",
          sender: 'ai',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Show welcome message on error
      setMessages([{
        id: 'welcome',
        content: "Hello, I'm your AI mental health companion. I'm here to provide professional, empathetic support as you navigate your thoughts and feelings. While I'm not a replacement for a licensed therapist, I can offer a safe space to talk, active listening, and evidence-based guidance. How can I support you today?",
        sender: 'ai',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send to backend
      const response = await sendChatMessage(content.trim());
      
      // Add AI response
      const aiMessage = {
        id: response.id || `ai-${Date.now()}`,
        content: response.response || response.message || 'I apologize, but I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: response.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      showError('Failed to send message. Please try again.');
      
      // Add error message from AI
      const errorMessage = {
        id: `error-${Date.now()}`,
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    handleSendMessage(prompt);
  };

  const handleClearHistory = async () => {
    try {
      await clearChatHistory();
      setMessages([{
        id: 'welcome',
        content: "Hello, I'm your AI mental health companion. I'm here to provide professional, empathetic support as you navigate your thoughts and feelings. While I'm not a replacement for a licensed therapist, I can offer a safe space to talk, active listening, and evidence-based guidance. How can I support you today?",
        sender: 'ai',
        timestamp: new Date().toISOString()
      }]);
      showSuccess('Chat history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      showError('Failed to clear chat history');
    }
  };

  if (!user || user.role !== 'patient') {
    return null;
  }

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background h-[calc(100vh-4rem)] md:h-screen flex flex-col">
          {/* Header */}
          <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Mindful Chat
              </h1>
              <p className="text-sm text-muted-foreground">Talk with your AI companion</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearHistory} 
              className="gap-2 bg-transparent"
              disabled={messages.length <= 1}
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          </div>

          {/* Messages container */}
          <div 
            ref={messagesContainerRef} 
            className="flex-1 overflow-y-auto px-6 py-8 space-y-4"
          >
            {isFetchingHistory ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
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
                          onClick={() => handleSuggestedPrompt(prompt)}
                        >
                          <p className="text-sm font-medium">{prompt}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {isLoading && (
                  <div className="flex justify-start gap-3">
                    <div className="bg-muted rounded-lg px-4 py-3 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <div
                            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                            style={{ animationDelay: '0s' }}
                          />
                          <div
                            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <div
                            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border px-6 py-4 bg-card/50 backdrop-blur-sm">
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder="Share your thoughts... (press Enter to send)"
                disabled={isLoading || isFetchingHistory}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim() || isFetchingHistory}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Powered by Thera-AI. Your conversations are private and secure.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
