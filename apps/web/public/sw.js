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
