import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  MessageSquare,
  Send,
  Plus,
  Bot,
  User,
  Loader2,
  Menu
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";

import "./ChatPage.css";

export default function ModernChatPage() {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messageEndRef = useRef(null);

  useEffect(() => {
    loadChatList();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new message
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadChatList() {
  const titles = [
    "Stress Relief Tips",
    "Daily Mood Check",
    "Talk About Anxiety",
    "Sleep Improvement Chat",
    "Mental Health Support",
    "Understanding Emotions",
    "Coping With Overthinking",
    "Motivation & Positivity",
    "Mindfulness Session",
    "General Support Chat"
  ];

  const placeholder = Array.from({ length: 5 }).map((_, i) => ({
    id: String(i + 1),
    title: titles[Math.floor(Math.random() * titles.length)]
  }));
  const res = await fetch("http://localhost:8000/api/v1/chat/list", {
      headers: { Authorization: `Bearer ${localStorage.getItem("theraai_auth_token")}` }
    });
    const data = await res.json();
  setChatList(placeholder);
}


  async function loadChat(chatId) {
    setCurrentChatId(chatId);

    const res = await fetch(
      `http://localhost:8000/api/v1/chat/${chatId}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("theraai_auth_token")}` }
      }
    );

    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function startNewChat() {
  // 1️⃣ Save current chat messages to DB if there is a current chat
  if (currentChatId && messages.length > 0) {
    try {
      await fetch(`http://localhost:8000/api/v1/chat/${currentChatId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("theraai_auth_token")}`
        },
        body: JSON.stringify({ messages })
      });
    } catch (err) {
      console.error("Failed to save current chat:", err);
    }
  }

  // 2️⃣ Create a new chat in the backend
  try {
    const res = await fetch("http://localhost:8000/api/v1/chat/new", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("theraai_auth_token")}` }
    });
    const data = await res.json();

    // 3️⃣ Clear chat window messages
    setMessages([]);

    // Load chat list again to include new chat
    await loadChatList();

    // Set the newly created chat as current
    await loadChat(data.chat_id);
  } catch (err) {
    console.error("Failed to start new chat:", err);
  }
}


async function sendMessage() {
  if (!input.trim()) return;

  const userMsg = { sender: "user", text: input };
  setMessages(prev => [...prev, userMsg]);
  setLoading(true);

  // Store the current input in a variable
  const messageToSend = input;

  // Clear the input immediately
  setInput("");

  try {
    const res = await fetch(
      "http://localhost:8000/api/v1/chat/message",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("theraai_auth_token")}`
        },
        body: JSON.stringify({
          chat_id: currentChatId,
          message: messageToSend
        })
      }
    );

    const botReply = await res.json();
    setMessages(prev => [...prev, { sender: "bot", text: botReply.reply }]);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}



  return (
    <div className="modern-chat-wrapper">
      
      {/* ========================= Sidebar ========================= */}
      <Card className="chat-sidebar">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            Your Chats
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Button className="w-full mb-4" onClick={startNewChat}>
            <Plus size={16} className="mr-2" /> Start New Chat
          </Button>

          <ScrollArea className="chat-list-scroll">
            {chatList.map(chat => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`chat-list-item ${currentChatId === chat.id ? "active" : ""}`}
              >
                <MessageSquare size={16} className="mr-2" />
                {chat.title || "Untitled Chat"}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ========================= Chat Window ========================= */}
      <Card className="chat-main">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot size={20} /> 
            Mental Health Chatbot
          </CardTitle>
        </CardHeader>

        <CardContent className="chat-window">
          
          {/* Messages */}
          <ScrollArea className="messages-area">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.sender}`}>
                <div className="bubble-icon">
                  {msg.sender === "user" ? (
                    <User size={18} />
                  ) : (
                    <Bot size={18} />
                  )}
                </div>
                <p className="bubble-text">{msg.text}</p>
              </div>
            ))}

            <div ref={messageEndRef}></div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="chat-input-box">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="chat-input"
            />


            <Button onClick={sendMessage}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
