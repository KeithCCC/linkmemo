// Minimal, quiet Service Worker for production
// - No noisy logging
// - Does not intercept network requests (no fetch handler)

self.addEventListener('install', () => {
  // Activate immediately on install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of open pages
  event.waitUntil(self.clients.claim());
});
