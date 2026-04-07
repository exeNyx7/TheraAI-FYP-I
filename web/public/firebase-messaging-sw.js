// Firebase Cloud Messaging Service Worker
// Required for receiving background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config is injected at runtime from query params or defaults
// (The actual values come from VITE_FIREBASE_* env vars set in the app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon } = payload.notification || {};
      self.registration.showNotification(title || 'TheraAI', {
        body: body || '',
        icon: icon || '/logo192.png',
        badge: '/logo192.png',
        data: payload.data || {},
      });
    });
  }
});
