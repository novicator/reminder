const IDB_NAME = 'reminders-db';
const IDB_STORE = 'pending';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(db) {
  return new Promise((resolve) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

function idbPut(db, item) {
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(item);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

function idbDelete(db, id) {
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

const timers = new Map();

async function schedule(reminder) {
  const db = await openDB();
  await idbPut(db, reminder);

  if (timers.has(reminder.id)) {
    clearTimeout(timers.get(reminder.id));
    timers.delete(reminder.id);
  }

  const delay = reminder.scheduledTime - Date.now();

  if (delay <= 0) {
    fire(reminder, db);
  } else {
    timers.set(reminder.id, setTimeout(() => fire(reminder), delay));
  }
}

async function fire(reminder, db) {
  if (!db) db = await openDB();

  await self.registration.showNotification(reminder.text, {
    requireInteraction: true,
    tag: reminder.id,
    icon: './icon.svg',
    badge: './icon.svg',
    vibrate: [200, 100, 200]
  });

  await idbDelete(db, reminder.id);
  timers.delete(reminder.id);

  const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of list) c.postMessage({ type: 'FIRED', id: reminder.id });
}

async function cancel(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
  const db = await openDB();
  await idbDelete(db, id);
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    clients.claim().then(async () => {
      // On restart, reschedule any timers that survived in IndexedDB
      const db = await openDB();
      const pending = await idbGetAll(db);
      for (const r of pending) {
        const delay = r.scheduledTime - Date.now();
        if (delay <= 0) {
          fire(r, db);
        } else {
          if (timers.has(r.id)) clearTimeout(timers.get(r.id));
          timers.set(r.id, setTimeout(() => fire(r), delay));
        }
      }
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCHEDULE') schedule(e.data.reminder);
  if (e.data?.type === 'CANCEL') cancel(e.data.id);
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
