// Minimal service worker: satisfies Chrome's installability requirement for the
// PWA install prompt, and cache-first-serves static, content-hashed assets
// (JS/CSS chunks, icons, menu photos) for near-instant repeat loads. Never
// caches navigations or API calls — order/payment/stock data must always be
// live, never served stale from a cache.
const STATIC_CACHE = "29foods-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

function isCacheableStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!isCacheableStaticAsset(url)) return; // everything else (pages, API) stays fully live

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }),
  );
});

// Web push — payload shape is { title, body, href?, thumbUrl?, tag?, orderId? } (see
// packages/core/src/push.ts). `tag` is what makes the live order-progress notification
// update in place through its four stages instead of stacking as separate alerts.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag,
    data: { href: payload.href || "/" },
  };
  if (payload.thumbUrl) options.image = payload.thumbUrl;

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data && event.notification.data.href ? event.notification.data.href : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(href) && "focus" in client) return client.focus();
      }
      if (clients.length > 0 && "focus" in clients[0]) {
        clients[0].navigate(href);
        return clients[0].focus();
      }
      return self.clients.openWindow(href);
    }),
  );
});
