self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  const { id, text } = data;

  e.waitUntil(
    self.registration.showNotification(text || 'Reminder', {
      requireInteraction: true,
      tag: id || Date.now().toString(),
      icon: './icon.svg',
      badge: './icon.svg',
      vibrate: [200, 100, 200],
    }).then(async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of list) c.postMessage({ type: 'FIRED', id });
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        c.postMessage({ type: 'DISMISSED', id: e.notification.tag });
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('./');
    })
  );
});

self.addEventListener('notificationclose', (e) => {
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) c.postMessage({ type: 'DISMISSED', id: e.notification.tag });
  });
});
