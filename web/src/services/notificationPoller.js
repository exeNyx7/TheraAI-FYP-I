import { useEffect, useRef, useState } from 'react';
import apiClient from '../apiClient';
import { useAuth } from '../contexts/AuthContext';

const POLL_INTERVAL_MS = 30000;

/**
 * useNotificationPoller — polls /notifications/unread every 30s while the
 * user is authenticated and dispatches a 'notification:new' CustomEvent for
 * any newly-seen notifications (by id).
 * Returns the latest notifications array.
 */
export function useNotificationPoller() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const seenIdsRef = useRef(new Set());
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      seenIdsRef.current = new Set();
      setNotifications([]);
      return;
    }

    const poll = async () => {
      try {
        const res = await apiClient.get('/notifications/unread');
        const list = Array.isArray(res.data) ? res.data : [];
        if (!mountedRef.current) return;
        setNotifications(list);

        // Fire events for new notifications only
        const fresh = list.filter((n) => n && n.id && !seenIdsRef.current.has(n.id));
        fresh.forEach((n) => {
          seenIdsRef.current.add(n.id);
          try {
            window.dispatchEvent(new CustomEvent('notification:new', { detail: n }));
          } catch (_) {}
        });
      } catch (_) {
        // silent — defensive
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [user]);

  return notifications;
}

export default useNotificationPoller;
