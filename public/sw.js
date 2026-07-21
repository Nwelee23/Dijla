/*
 * Dijla service worker.
 *
 * Deliberately conservative about what it stores. Restaurant dashboards and the
 * driver app render one tenant's live data, and a phone in a restaurant is a
 * shared device — so HTML responses are NEVER written to the cache. Only the
 * offline fallback and immutable build assets are cached. Getting this wrong
 * would serve one user's orders to the next person who opens the app.
 */

const VERSION = "dijla-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline";

const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Build output is content-hashed, so it is safe to cache forever. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET. Never intercept order placement, sign-in, or any mutation.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only — Supabase REST/Realtime/Storage must go straight to the network.
  if (url.origin !== self.location.origin) return;

  // API routes are dynamic and often tenant-scoped.
  if (url.pathname.startsWith("/api/")) return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Page navigations: always go to the network. On failure show the offline
  // page. The response itself is never cached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ??
            new Response("غير متصل بالإنترنت", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        )
      )
    );
  }
});
