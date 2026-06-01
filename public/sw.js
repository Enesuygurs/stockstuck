// StockStuck Service Worker for Web Push & Background Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Web Push event from server/client
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: '🔔 StockStuck Alarm Bildirimi', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 StockStuck Borsa Bildirimi';
  const options = {
    body: data.body || 'Fiyat veya indikatör hedefiniz tetiklendi.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
    vibrate: [200, 100, 200],
    tag: data.tag || 'stockstuck-alert',
    renotify: true,
    data: {
      url: data.url || '/',
      symbol: data.symbol
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicking on the push notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (notifData.symbol) {
            client.postMessage({ type: 'SELECT_STOCK', symbol: notifData.symbol });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
