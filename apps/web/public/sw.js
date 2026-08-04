// Basic Service Worker for PWA

const CACHE_NAME = 'futurebet-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// A very basic fetch handler to satisfy PWA requirements
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Let the browser handle standard requests for now
  // We can add offline fallbacks or more advanced caching later if needed
});

// Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'FutureBet Alert';
  const options = {
    body: data.body || 'New prediction available!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicking on the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
