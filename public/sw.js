/* ETEA Prep Library — hand-written service worker (Stage 4A, PWA).
 *
 * No build-time precache manifest exists: the site is a Next.js App
 * Router build whose JS/CSS chunks carry content-hashed names, so this
 * worker precaches the KNOWN shell URLs (routes + manifest + icons)
 * and caches the hashed chunks at RUNTIME on first load. The study
 * data (content.json + all 16 bank files) is statically imported by
 * src/lib/data.ts and bundled INTO those chunks — caching
 * /_next/static/* is what makes Library notes, flashcards and practice
 * MCQs work offline. The raw JSON files are never served as URLs, so
 * they cannot be precached by URL; see VERIFY-stage4a-pwa.md §2.
 *
 * OFFLINE HONESTY: offline use works after the first ONLINE visit
 * (the visit that installs this worker and caches the chunks). A
 * first-ever visit with no connection cannot load the app — no
 * worker can conjure bytes it has never seen.
 *
 * CACHE VERSION: bump CACHE_VERSION whenever a deploy changes the
 * shell in a way old cached HTML must not survive. Activation deletes
 * every cache whose name does not match. (Hashed /_next/static/*
 * assets are immutable, so reusing them across versions is safe;
 * navigations are network-first, so online loads always refresh.)
 *
 * UPDATE FLOW: this worker does NOT call skipWaiting() on install.
 * A new version installs, waits, and the app shows an "Update
 * available — refresh" notice (see PwaProvider). Only the user's
 * Refresh click posts SKIP_WAITING, so nobody is force-reloaded
 * mid-quiz. Activation then claims clients and cleans old caches.
 */

const CACHE_VERSION = "etea-prep-v1";

// App shell: every statically prerendered route, the manifest and the
// icons. Dynamic routes (/mock/[id], /tracks/[id]) are cached at
// runtime by the navigation handler below.
const PRECACHE_URLS = [
  "/",
  "/analysis",
  "/flashcards",
  "/issues",
  "/library",
  "/links",
  "/mock",
  "/plan",
  "/practice",
  "/review",
  "/topics",
  "/tracks",
  "/tutor",
  "/vacancies",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        // Best-effort: one failed URL (e.g. a flaky first load) must
        // not fail the whole install — runtime caching fills gaps.
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

// The app posts this ONLY when the user clicks Refresh on the update
// notice — never automatically, never mid-quiz.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only same-origin GETs are ever cached. Cross-origin requests and
  // non-GETs pass through untouched.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // NETWORK-ONLY: the AI APIs must never serve a cached or stale
  // response. No respondWith = a plain network fetch; the app's own
  // failure handling (Retry + offline library search) covers the
  // offline case.
  if (url.pathname.startsWith("/api/")) return;

  // CACHE-FIRST: hashed, immutable build assets — including the JS
  // chunks that carry the bundled study data. Safe to serve from
  // cache forever; a new build has new hashes.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (isCacheable(response)) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // NETWORK-FIRST (navigations): an online load always gets fresh
  // HTML; the cache is only the offline fallback, and the cached home
  // page is the last-resort offline fallback for any route.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  // STALE-WHILE-REVALIDATE: everything else same-origin (RSC
  // payloads, manifest, icons, fonts) — serve cache instantly, refresh
  // in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => undefined);
      return cached || network;
    }),
  );
});
