import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import { useNotificationPoller } from '../../services/notificationPoller';

const TITLES = {
  booking_confirmed: 'Booking Confirmed',
  reminder_15m: 'Session in 15 minutes',
  reminder_5m: 'Session in 5 minutes',
  session_starting: 'Session Starting Now',
};

function titleFor(n) {
  return (n && TITLES[n.type]) || (n && n.title) || 'Notification';
}

export default function NotificationPopup() {
  const navigate = useNavigate();
  useNotificationPoller(); // activates polling side-effects
  const [popups, setPopups] = useState([]);

  const dismiss = useCallback((id) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handler = (ev) => {
      const n = ev && ev.detail;
      if (!n || !n.id) return;
      setPopups((prev) => {
        if (prev.some((p) => p.id === n.id)) return prev;
        return [...prev, n];
      });
      // auto-dismiss after 10s
      setTimeout(() => dismiss(n.id), 10000);
    };
    window.addEventListener('notification:new', handler);
    return () => window.removeEventListener('notification:new', handler);
  }, [dismiss]);

  const handleJoin = async (n) => {
    await markRead(n.id);
    dismiss(n.id);
    if (n.appointment_id) navigate(`/waiting-room/${n.appointment_id}`);
  };

  const handleClose = async (n) => {
    await markRead(n.id);
    dismiss(n.id);
  };

  if (popups.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        left: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: 360,
        marginLeft: 'auto',
        pointerEvents: 'none',
      }}
    >
      {popups.map((n) => (
        <div
          key={n.id}
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            borderRadius: 10,
            padding: 14,
            borderLeft: '4px solid #667eea',
            fontFamily: 'Inter, system-ui, sans-serif',
            width: '100%',
            maxWidth: 360,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
            <strong style={{ fontSize: 14, color: '#1f2937' }}>{titleFor(n)}</strong>
            <button
              onClick={() => handleClose(n)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          {n.body && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#4b5563' }}>{n.body}</p>
          )}
          {n.appointment_id && (n.type === 'session_starting' || n.type === 'reminder_5m' || n.type === 'reminder_15m') && (
            <button
              onClick={() => handleJoin(n)}
              style={{
                marginTop: 10,
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Join Call
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
