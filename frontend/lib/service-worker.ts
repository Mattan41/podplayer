/**
 * Registers the app-shell service worker.
 *
 * The worker itself is `frontend/public/sw.js`, copied verbatim into the export
 * and served from the site root, so its scope covers the whole origin (the site
 * is deployed at the domain root, so `basePath` is unset). Registration is
 * best-effort: a browser without service-worker support, or a registration that
 * fails, must leave the app working. See docs/DECISIONS.md entry 42.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // A failed registration is not a reason to break the app.
  }
}
