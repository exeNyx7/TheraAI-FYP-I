/**
 * NotificationPopup — real-time in-app toast popups.
 *
 * Listens to the 'notification:new' CustomEvent fired by NotificationContext.
 * Does NOT do its own polling — that would create a second timer.
 *
 * Hooks used correctly:
 *   useReducer  — popup list (deduplication logic lives in reducer, not render)
 *   useRef      — timer map (cleanup on unmount / manual dismiss)
 *   useCallback — stable handlers (no new function refs on re-render)
 *   useMemo     — derived config per popup type (computed once per type, not per render)
 */

import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

// ── Per-type visual config ───────────────────────────────────────────────────
const TYPE_CONFIG = {
  crisis_alert: {
    accent:   '#ef4444',
    bg:       '#fff5f5',
    icon:     '🚨',
    label:    'Crisis Alert',
    duration: 40_000,
  },
  appointment_booked: {
    accent:   '#22c55e',
    bg:       '#f0fdf4',
    icon:     '📅',
    label:    'Appointment Confirmed',
    duration: 8_000,
  },
  appointment_cancelled: {
    accent:   '#f97316',
    bg:       '#fff7ed',
    icon:     '🗓️',
    label:    'Appointment Cancelled',
    duration: 10_000,
  },
  appointment_reminder: {
    accent:   '#667eea',
    bg:       '#f0f0ff',
    icon:     '⏰',
    label:    'Upcoming Session',
    duration: 12_000,
  },
  session_notes_added: {
    accent:   '#667eea',
    bg:       '#f0f0ff',
    icon:     '📝',
    label:    'Session Notes',
    duration: 8_000,
  },
  booked_by_admin: {
    accent:   '#22c55e',
    bg:       '#f0fdf4',
    icon:     '📅',
    label:    'Session Booked',
    duration: 10_000,
  },
  session_tomorrow: {
    accent:   '#667eea',
    bg:       '#f0f0ff',
    icon:     '⏰',
    label:    'Reminder',
    duration: 10_000,
  },
  // booking_confirmed / reminder_* come from legacy system
  booking_confirmed: {
    accent:   '#22c55e',
    bg:       '#f0fdf4',
    icon:     '📅',
    label:    'Booking Confirmed',
    duration: 8_000,
  },
  reminder_15m: {
    accent:   '#667eea',
    bg:       '#f0f0ff',
    icon:     '⏰',
    label:    'Session in 15 min',
    duration: 15_000,
  },
  reminder_5m: {
    accent:   '#f97316',
    bg:       '#fff7ed',
    icon:     '⏰',
    label:    'Session in 5 min',
    duration: 20_000,
  },
  session_starting: {
    accent:   '#ef4444',
    bg:       '#fff5f5',
    icon:     '📹',
    label:    'Session Starting Now',
    duration: 30_000,
  },
};

const DEFAULT_CONFIG = {
  accent:   '#667eea',
  bg:       '#f0f0ff',
  icon:     '🔔',
  label:    'Notification',
  duration: 6_000,
};

function configFor(type) {
  return TYPE_CONFIG[type] || DEFAULT_CONFIG;
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function popupReducer(popups, action) {
  switch (action.type) {
    case 'ADD':
      // deduplicate by id
      if (popups.some((p) => p.id === action.payload.id)) return popups;
      return [...popups, action.payload];
    case 'REMOVE':
      return popups.filter((p) => p.id !== action.id);
    default:
      return popups;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationPopup() {
  const navigate    = useNavigate();
  const { markRead } = useNotifications(); // context — no extra poll
  const [popups, dispatch] = useReducer(popupReducer, []);

  // Map<id, timeoutId> — stored in ref so it never triggers re-renders
  const timersRef = useRef(new Map());

  // Schedule auto-dismiss; clears existing timer if called twice for same id
  const scheduleDismiss = useCallback((id, ms) => {
    if (timersRef.current.has(id)) clearTimeout(timersRef.current.get(id));
    const tid = setTimeout(() => {
      dispatch({ type: 'REMOVE', id });
      timersRef.current.delete(id);
    }, ms);
    timersRef.current.set(id, tid);
  }, []);

  // Clear ALL timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((tid) => clearTimeout(tid));
  }, []);

  // Listen for new notifications from the single NotificationContext poller
  useEffect(() => {
    const handler = (ev) => {
      const n = ev?.detail;
      if (!n?.id) return;
      const cfg = configFor(n.type);
      dispatch({ type: 'ADD', payload: n });
      scheduleDismiss(n.id, cfg.duration);
    };
    window.addEventListener('notification:new', handler);
    return () => window.removeEventListener('notification:new', handler);
  }, [scheduleDismiss]);

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    dispatch({ type: 'REMOVE', id });
  }, []);

  const handleClose = useCallback(async (n) => {
    await markRead(n.id);
    dismiss(n.id);
  }, [markRead, dismiss]);

  const handleJoin = useCallback(async (n) => {
    await markRead(n.id);
    dismiss(n.id);
    if (n.appointment_id) navigate(`/waiting-room/${n.appointment_id}`);
  }, [markRead, dismiss, navigate]);

  const handleViewDashboard = useCallback(async (n) => {
    await markRead(n.id);
    dismiss(n.id);
    navigate('/therapist-dashboard');
  }, [markRead, dismiss, navigate]);

  if (popups.length === 0) return null;

  return (
    <div
      style={{
        position:      'fixed',
        top:           16,
        right:         16,
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        width:         360,
        maxWidth:      'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}
    >
      {popups.map((n) => (
        <PopupCard
          key={n.id}
          n={n}
          onClose={handleClose}
          onJoin={handleJoin}
          onViewDashboard={handleViewDashboard}
        />
      ))}
    </div>
  );
}

// ── PopupCard (memoised so siblings don't re-render when list changes) ────────
import { memo } from 'react';

const PopupCard = memo(function PopupCard({ n, onClose, onJoin, onViewDashboard }) {
  // useMemo: config object is stable per notification type string
  const cfg = useMemo(() => configFor(n.type), [n.type]);
  const isCrisis      = n.type === 'crisis_alert';
  const isSessionCall = ['session_starting', 'reminder_5m', 'reminder_15m'].includes(n.type);
  const title         = n.title || cfg.label;

  return (
    <div
      style={{
        background:    cfg.bg,
        border:        `1px solid ${cfg.accent}22`,
        borderLeft:    `5px solid ${cfg.accent}`,
        borderRadius:  12,
        padding:       '14px 16px',
        boxShadow:     isCrisis
          ? `0 8px 32px ${cfg.accent}33`
          : '0 4px 20px rgba(0,0,0,0.10)',
        fontFamily:    'Inter, system-ui, sans-serif',
        pointerEvents: 'auto',
        animation:     'notifSlideIn 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {cfg.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin:     0,
            fontSize:   14,
            fontWeight: 700,
            color:      isCrisis ? cfg.accent : '#1a202c',
            lineHeight: 1.3,
          }}>
            {title}
          </p>
          {n.body && (
            <p style={{
              margin:   '5px 0 0',
              fontSize: 13,
              color:    '#4a5568',
              lineHeight: 1.5,
            }}>
              {n.body}
            </p>
          )}
        </div>
        <button
          onClick={() => onClose(n)}
          aria-label="Dismiss notification"
          style={{
            background:  'transparent',
            border:      'none',
            cursor:      'pointer',
            color:       '#a0aec0',
            fontSize:    18,
            lineHeight:  1,
            padding:     0,
            flexShrink:  0,
            marginTop:   2,
          }}
        >
          ×
        </button>
      </div>

      {/* CTA buttons */}
      {(isCrisis || isSessionCall) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {isCrisis && (
            <button
              onClick={() => onViewDashboard(n)}
              style={ctaStyle(cfg.accent)}
            >
              View Dashboard
            </button>
          )}
          {isSessionCall && n.appointment_id && (
            <button
              onClick={() => onJoin(n)}
              style={ctaStyle(cfg.accent)}
            >
              Join Call
            </button>
          )}
        </div>
      )}
    </div>
  );
});

function ctaStyle(accent) {
  return {
    background:   accent,
    color:        '#fff',
    border:       'none',
    borderRadius: 7,
    padding:      '7px 14px',
    fontSize:     13,
    fontWeight:   600,
    cursor:       'pointer',
    lineHeight:   1,
  };
}
