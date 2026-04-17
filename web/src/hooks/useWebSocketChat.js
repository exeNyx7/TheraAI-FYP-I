/**
 * useWebSocketChat
 *
 * Manages a WebSocket connection to /ws/chat for real-time AI chat.
 * Falls back to the REST API if the WebSocket fails to connect.
 *
 * Usage:
 *   const { sendMessage, isTyping, connected } = useWebSocketChat({ onMessage, onCrisis });
 */

import { useRef, useState, useEffect, useCallback } from 'react';

const WS_URL = (() => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return base.replace(/^http/, 'ws');
})();

const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'theraai_auth_token';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * @param {object} opts
 * @param {(msg: object) => void} opts.onMessage  - Called with parsed server message
 * @param {(crisis: object) => void} [opts.onCrisis] - Called when crisis is detected
 * @param {boolean} [opts.enabled=true]           - Set false to skip WS entirely
 */
export function useWebSocketChat({ onMessage, onCrisis, enabled = true } = {}) {
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);

  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const onMessageRef = useRef(onMessage);
  const onCrisisRef = useRef(onCrisis);
  onMessageRef.current = onMessage;
  onCrisisRef.current = onCrisis;

  const connect = useCallback(() => {
    if (!enabled) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const url = `${WS_URL}/ws/chat?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'typing') {
          setIsTyping(true);
          return;
        }

        setIsTyping(false);

        if (data.type === 'assistant') {
          onMessageRef.current?.(data);

          if (data.show_book_therapist && data.crisis_severity && data.crisis_severity !== 'none') {
            onCrisisRef.current?.({ severity: data.crisis_severity });
          }
        } else if (data.type === 'error') {
          onMessageRef.current?.({ type: 'error', content: data.content });
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      setIsTyping(false);
      wsRef.current = null;

      // Auto-reconnect unless closed intentionally (code 1000) or auth failed (4001)
      if (event.code !== 1000 && event.code !== 4001 && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, handle reconnect there
      setConnected(false);
    };
  }, [enabled]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close(1000);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message }));
      return true;
    }
    return false; // caller should fall back to REST
  }, []);

  return { sendMessage, isTyping, connected };
}
