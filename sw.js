/* Lightweight offline shell for the STS2 Win Rate Tracker. */
const CACHE_NAME = 'sts2-winrate-v1.3';
const ROOT = self.registration.scope;
const PAGE_URL = new URL('index.html', ROOT).href;
const HTML2CANVAS = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const CORE = [
  ROOT,
  PAGE_URL,
  new URL('manifest.webmanifest', ROOT).href,
  new URL('icons/icon-192.png', ROOT).href,
  new URL('icons/icon-512.png', ROOT).href,
  new URL('icons/apple-touch-icon.png', ROOT).href,
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    // Optional external library: failure must not block offline win-rate tracking.
    await cache.add(HTML2CANVAS).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('sts2-winrate-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.startsWith(new URL(ROOT).pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(PAGE_URL, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(PAGE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (url.href === HTML2CANVAS || (url.origin === self.location.origin && url.pathname.startsWith(new URL(ROOT).pathname))) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
