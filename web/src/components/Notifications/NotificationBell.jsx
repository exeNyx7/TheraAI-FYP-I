import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import apiClient from '../../apiClient';
import { useNotificationPoller } from '../../services/notificationPoller';

export function NotificationBell({ isCollapsed }) {
  const polled = useNotificationPoller();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setNotifications(polled); }, [polled]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = useCallback(async (id) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (_) {}
  }, []);

  const unread = notifications.length;

  return (
    <div ref={ref} className="relative">
      {/* Same visual pattern as nav items */}
      <button
        onClick={() => setOpen(o => !o)}
        title={isCollapsed ? 'Notifications' : ''}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent/60 group ${
          isCollapsed ? 'justify-center px-0' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <Bell className="h-5 w-5 group-hover:scale-105 transition-transform" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 w-72 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ bottom: 0, left: 'calc(100% + 10px)' }}
        >
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <span className="text-xs text-muted-foreground">{unread} unread</span>}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title || 'Notification'}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  </div>
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-[10px] text-primary hover:underline flex-shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
