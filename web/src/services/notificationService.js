/**
 * Notification Service
 * Handles Firebase Cloud Messaging device token registration
 * Gracefully no-ops if Firebase is not configured (VITE_FIREBASE_* env vars missing)
 */

import apiClient from '../apiClient';

let firebaseMessaging = null;

/**
 * Initialize Firebase messaging if env vars are configured.
 * Returns the messaging instance or null if not configured.
 */
async function getMessaging() {
  if (firebaseMessaging) return firebaseMessaging;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging: getFCMMessaging, getToken, onMessage } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    firebaseMessaging = getFCMMessaging(app);

    // Listen for foreground messages and dispatch a custom event
    onMessage(firebaseMessaging, (payload) => {
      window.dispatchEvent(
        new CustomEvent('fcm:message', { detail: payload })
      );
    });

    return firebaseMessaging;
  } catch {
    return null;
  }
}

/**
 * Request notification permission, get FCM token, and register it with the backend.
 * Safe to call on every login — backend upserts the token.
 */
export async function registerDeviceForNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  const messaging = await getMessaging();
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const { getToken } = await import('firebase/messaging');
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messaging, { vapidKey });
    if (!token) return;

    await apiClient.post('/notifications/register-device', {
      token,
      device_type: 'web',
    });
  } catch (err) {
    // Non-critical — silently ignore FCM errors
    console.debug('FCM registration skipped:', err?.message);
  }
}

/**
 * Unregister the current device token on logout.
 */
export async function unregisterDevice() {
  const messaging = await getMessaging();
  if (!messaging) return;

  try {
    const { getToken, deleteToken } = await import('firebase/messaging');
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });

    if (token) {
      await apiClient.post('/notifications/unregister-device', {
        token,
        device_type: 'web',
      });
      await deleteToken(messaging);
    }
  } catch {
    // Non-critical
  }
}

export default { registerDeviceForNotifications, unregisterDevice };
