/**
 * Wellness Companion Chat Page
 * AI-powered mental wellness companion for personalized support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Sparkles, Heart, Brain, Smile,
  TrendingUp, Book, Calendar, MessageCircle, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { sendChatMessage } from '../../services/chatService';
import './Chat.css';

function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your Wellness Companion. I'm here to support you on your mental wellness journey. How are you feeling today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const suggestedPrompts = [
    {
      icon: Smile,
      text: "I'm feeling anxious today",
      color: 'purple'
    },
    {
      icon: Brain,
      text: "Help me manage stress",
      color: 'blue'
    },
    {
      icon: Heart,
      text: "I need some motivation",
      color: 'pink'
    },
    {
      icon: TrendingUp,
      text: "Tips for better sleep",
      color: 'green'
    },
    {
      icon: Book,
      text: "Suggest a mindfulness exercise",
      color: 'orange'
    },
    {
      icon: Calendar,
      text: "How can I stay consistent?",
      color: 'indigo'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    
    if (!textToSend) return;

    // Hide suggestions after first message
    setShowSuggestions(false);

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call actual API
      const response = await sendChatMessage(textToSend);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Fallback to local response if API fails
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm having trouble connecting right now. Please try again in a moment. If the issue persists, please check your internet connection.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (text) => {
    handleSendMessage(text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="chat-title-section">
          <div className="chat-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="chat-title">Wellness Companion</h1>
            <p className="chat-subtitle">Your personal AI mental health support</p>
          </div>
        </div>

        <div className="chat-status">
          <div className="status-indicator active"></div>
          <span>Always here for you</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="chat-container">
        <div className="messages-wrapper">
          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-icon">
              <Heart size={32} />
            </div>
            <h3>Welcome to Your Safe Space</h3>
            <p>
              I'm here to listen, support, and guide you. Our conversations are confidential
              and designed to help you on your mental wellness journey.
            </p>
          </div>

          {/* Messages */}
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.type === 'user' ? 'user-message' : 'ai-message'}`}
            >
              {message.type === 'ai' && (
                <div className="message-avatar ai-avatar">
                  <Sparkles size={16} />
                </div>
              )}
              
              <div className="message-content">
                <div className="message-bubble">
                  {message.content}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="message-avatar user-avatar">
                  You
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="message ai-message">
              <div className="message-avatar ai-avatar">
                <Sparkles size={16} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Prompts */}
          {showSuggestions && messages.length === 1 && (
            <div className="suggestions-container">
              <p className="suggestions-title">💡 Try asking me about:</p>
              <div className="suggestions-grid">
                {suggestedPrompts.map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={index}
                      className={`suggestion-card suggestion-${prompt.color}`}
                      onClick={() => handleSuggestionClick(prompt.text)}
                    >
                      <Icon size={20} />
                      <span>{prompt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Share what's on your mind..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button 
            className="send-button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isTyping}
          >
            {isTyping ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="chat-disclaimer">
          💚 Remember: While I'm here to support you, I'm not a replacement for professional help.
          If you're in crisis, please reach out to a mental health professional.
        </p>
      </div>
    </div>
  );
}

export default Chat;
