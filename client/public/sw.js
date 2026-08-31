const CACHE = "menwe-portal-v2";

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // Never let the service worker serve an old copy of itself.
  if (url.pathname === "/sw.js") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Authentication, API calls and HTML navigations must always see the latest server response.
  if (url.pathname.startsWith("/assets/") === false || request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() => caches.match(request))
    );
    return;
  }

  // Vite assets are content-hashed, so they are safe to cache after the first fetch.
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});
