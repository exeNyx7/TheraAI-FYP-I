/**
 * notificationPoller — legacy shim.
 *
 * Polling has moved to NotificationContext (single source, no duplicate timers).
 * This file re-exports useNotifications so old import sites don't break.
 */

export { useNotifications as useNotificationPoller } from '../contexts/NotificationContext';
export default function noop() {}
