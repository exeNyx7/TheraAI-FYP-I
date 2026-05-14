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

const POLL_MS = 30_000;

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
  const seenIdsRef  = useRef(new Set());
  const timerRef    = useRef(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const poll = useCallback(async () => {
    try {
      const res  = await apiClient.get('/notifications/unread');
      const list = Array.isArray(res.data) ? res.data : [];
      if (!mountedRef.current) return;

      dispatch({ type: 'SET', payload: list });

      // Fire CustomEvent only for genuinely new notifications
      const fresh = list.filter((n) => n?.id && !seenIdsRef.current.has(n.id));
      fresh.forEach((n) => {
        seenIdsRef.current.add(n.id);
        window.dispatchEvent(new CustomEvent('notification:new', { detail: n }));
      });
    } catch (_) {
      // network errors are silent — poller is best-effort
    }
  }, []);

  useEffect(() => {
    if (!user) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      seenIdsRef.current = new Set();
      dispatch({ type: 'CLEAR' });
      return;
    }
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
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
