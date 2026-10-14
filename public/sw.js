/*
 * IVS — Intelligent Video Studio service worker.
 *
 * Deliberately narrow: it caches the immutable build output, the self-hosted
 * fonts and the app icons so a second visit starts offline-ready, and it never
 * caches navigations or media. Projects, transcripts and footage already live in
 * IndexedDB/OPFS on this device — a stale HTML shell on top of that would be a
 * lie about what the app currently is, so navigations are always network.
 */

const VERSION = "dz-v1";
const STATIC_CACHE = `${VERSION}-static`;

const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isCacheableAsset(url)) return;

  // Hashed build assets are immutable; fonts and icons are stable. Serve from
  // cache and refresh in the background.
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) void cache.put(request, response.clone());
          return response;
        })
        .catch(() => undefined);

      if (cached) {
        void network;
        return cached;
      }
      const response = await network;
      return response ?? Response.error();
    })(),
  );
});
