/**
 * NotificationBell — sidebar bell icon with unread badge and popup panel.
 *
 * Mobile (< lg): panel is a fixed bottom-sheet overlay.
 * Desktop (lg+): panel is absolutely positioned to the right of the sidebar.
 */

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export const NotificationBell = memo(function NotificationBell({ isCollapsed }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside (desktop only — mobile has its own backdrop)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = useCallback(async (id) => {
    await markRead(id);
  }, [markRead]);

  const handleMarkAll = useCallback(async () => {
    await markAllRead();
    setOpen(false);
  }, [markAllRead]);

  const toggleOpen = useCallback(() => setOpen((o) => !o), []);

  const badgeLabel = useMemo(() => (unreadCount > 9 ? '9+' : unreadCount), [unreadCount]);

  // Shared panel content
  const panelContent = (
    <>
      {/* Panel header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
        <p className="text-sm font-semibold">Notifications</p>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
          {/* Close button — always visible on mobile for the bottom sheet */}
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">No new notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationRow key={n.id} n={n} onDismiss={handleMarkRead} />
          ))
        )}
      </div>
    </>
  );

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger button */}
      <button
        onClick={toggleOpen}
        title={isCollapsed ? 'Notifications' : ''}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent/60 group ${
          isCollapsed ? 'justify-center px-0' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <Bell className="h-5 w-5 group-hover:scale-105 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
              {badgeLabel}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {badgeLabel}
              </span>
            )}
          </>
        )}
      </button>

      {/* Desktop panel — absolute, to the right of the sidebar */}
      {open && (
        <div
          className="hidden lg:block absolute z-50 w-80 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ bottom: 0, left: 'calc(100% + 10px)' }}
        >
          {panelContent}
        </div>
      )}

      {/* Mobile panel — fixed bottom sheet + backdrop */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-2xl overflow-hidden">
            {panelContent}
          </div>
        </>
      )}
    </div>
  );
});

// Separate memoised row so only changed rows re-render
const NotificationRow = memo(function NotificationRow({ n, onDismiss }) {
  const isCrisis = n.type === 'crisis_alert';
  const accentClass = isCrisis ? 'bg-red-500' : 'bg-primary';

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0">
      <div className={`h-2 w-2 rounded-full ${accentClass} mt-1.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCrisis ? 'text-red-600' : ''}`}>
          {n.title || 'Notification'}
        </p>
        {n.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(n.id)}
        aria-label="Dismiss"
        className="text-[10px] text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5 p-1"
      >
        ✕
      </button>
    </div>
  );
});
