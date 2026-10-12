// Service worker mínimo para hacer instalable el CRM (PWA).
// Estrategia: solo los assets con hash (/assets/*) se cachean (son inmutables).
// El HTML shell y las navegaciones NUNCA se cachean: el servidor los sirve con
// no-store para que cada deploy se vea de inmediato. Cachear el index.html era
// lo que provocaba "Failed to fetch dynamically imported module" tras un deploy.
const CACHE = 'xorbit360-shell-v2';
const SHELL = ['/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Notificaciones push: muestra la difusión aunque la app esté cerrada.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
  const title = data.title || 'Xorbit 360';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    data: data.data || {},
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar la notificación, abre la app (y el enlace si trae uno).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Nunca interceptar la API ni websockets: siempre a la red.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket')) return;
  if (event.request.method !== 'GET') return;
  // Navegaciones y HTML: siempre a la red (el servidor envía no-store).
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) return;
  // Solo cachear assets inmutables con hash del mismo origen.
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
