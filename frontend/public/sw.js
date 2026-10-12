/*
 * Podplayer — app-shell service worker.
 *
 * Scope is deliberately narrow: it caches the app shell (the HTML pages and the
 * static assets they load) so an installed app opens without a network round
 * trip, and it does nothing else. API calls and the Supabase client are
 * cross-origin and are left untouched, so playback state and feed reads keep
 * hitting the network. Offline audio is Phase G.
 *
 * Bump CACHE_NAME on every release. The activate handler deletes every cache
 * whose name is not the current one, so a deploy evicts the previous shell, and
 * a worker whose precache is broken fails to install rather than replacing the
 * working one. See docs/DECISIONS.md entries 42 and 43.
 */
const CACHE_NAME = "podplayer-shell-v1";

/* Pre-cached on install so a fresh install has a shell before the first fetch. */
const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  /* The backend API and Supabase live on other origins: leave them alone. */
  if (url.origin !== self.location.origin) {
    return;
  }

  /* Navigations: cache-first, so the shell paints before the network answers. */
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => caches.match("/index.html")),
      ),
    );
    return;
  }

  /* Static assets (hashed bundles, icons, manifest): cache-first, fill on miss. */
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
