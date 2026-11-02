// Service worker: shows push notifications, even when the site is closed,
// and opens (or focuses) the site on the right page when one is clicked.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Discovery Club Junior', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Discovery Club Junior';
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || '',
        icon: data.icon || '/favicon.png',
        badge: '/favicon.png',
        tag: data.tag,
        data: { url: data.url || '/' },
        renotify: !!data.tag
      }),
      // Tell open tabs to refresh their bell right away
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => tabs.forEach((tab) => tab.postMessage({ type: 'notification' })))
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL(link.startsWith('#') ? '/' + link : link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
      if (tab) {
        tab.postMessage({ type: 'open', url: link });
        return tab.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
