self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        client.postMessage({ type: 'DISMISSED', id: e.notification.tag });
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('./');
    })
  );
});

self.addEventListener('notificationclose', (e) => {
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      client.postMessage({ type: 'DISMISSED', id: e.notification.tag });
    }
  });
});
