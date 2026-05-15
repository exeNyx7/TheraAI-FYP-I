/**
 * NotificationContext — single source of truth for in-app notifications.
 *
 * • Polls /notifications/unread once every 30 s (one timer, app-wide).
 * • Dispatches a 'notification:new' CustomEvent for each new notification
 *   so the popup layer can react without prop-drilling.
 * • Exposes markRead / markAllRead so consumers don't need apiClient directly.
 */

import React, {
  createContext, useContext, useReducer, useEffect,
  useRef, useCallback, useMemo,
} from 'react';
import apiClient from '../apiClient';
import { useAuth } from './AuthContext';

const BASE_POLL_MS = 30_000;
const MAX_POLL_MS  = 300_000; // back off to 5 min max on repeated errors

// ── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return action.payload;
    case 'REMOVE':
      return state.filter((n) => n.id !== action.id);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, dispatch] = useReducer(reducer, []);
  const seenIdsRef    = useRef(new Set());
  const timerRef      = useRef(null);
  const mountedRef    = useRef(true);
  const errorCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep a stable ref so setTimeout can call the latest poll without stale closures
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res  = await apiClient.get('/notifications/unread');
      const list = Array.isArray(res.data) ? res.data : [];
      if (!mountedRef.current) return;

      errorCountRef.current = 0; // reset backoff on success
      dispatch({ type: 'SET', payload: list });

      // Fire CustomEvent only for genuinely new notifications
      const fresh = list.filter((n) => n?.id && !seenIdsRef.current.has(n.id));
      fresh.forEach((n) => {
        seenIdsRef.current.add(n.id);
        window.dispatchEvent(new CustomEvent('notification:new', { detail: n }));
      });
      if (mountedRef.current) {
        timerRef.current = setTimeout(() => pollRef.current?.(), BASE_POLL_MS);
      }
    } catch (_) {
      // Exponential backoff: 30s → 60s → 120s → … → 300s max
      errorCountRef.current += 1;
      const backoff = Math.min(BASE_POLL_MS * (2 ** (errorCountRef.current - 1)), MAX_POLL_MS);
      if (mountedRef.current) {
        timerRef.current = setTimeout(() => pollRef.current?.(), backoff);
      }
    }
  }, []);

  useEffect(() => { pollRef.current = poll; }, [poll]);

  useEffect(() => {
    if (!user) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      seenIdsRef.current = new Set();
      errorCountRef.current = 0;
      dispatch({ type: 'CLEAR' });
      return;
    }
    poll(); // initial fetch, then self-schedules
    return () => clearTimeout(timerRef.current);
  }, [user, poll]);

  const markRead = useCallback(async (id) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      dispatch({ type: 'REMOVE', id });
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiClient.post('/notifications/read-all');
      dispatch({ type: 'CLEAR' });
    } catch (_) {}
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.length,
    markRead,
    markAllRead,
  }), [notifications, markRead, markAllRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}
