/**
 * A localStorage cache with a stale-while-revalidate shape.
 *
 * No dependency and no state: the whole mechanism is JSON in and JSON out plus
 * a synchronous read. It exists because a cold Cloud Run container can take 20+
 * seconds to answer, and a blank screen for that long reads as a broken app. A
 * stale value shown at once and replaced when the network answers is a better
 * experience than a spinner.
 *
 * Keys are namespaced `podplayer.cache.*` so this app cannot collide with
 * anything else on the origin. They are constants here rather than inlined at
 * the call site, so a rename is one edit.
 *
 * `refreshPodcast` is deliberately not given a key: its whole purpose is to
 * reach the server and import whatever the feed published since the last read.
 */

export const SUBSCRIPTIONS_CACHE_KEY = "podplayer.cache.subscriptions";

/**
 * @param podcastId the podcast whose episode list is cached
 * @returns the key holding that podcast's first episode page. Only the first
 *          page is cached: later pages are appended in memory by the view, so
 *          caching them would either need per-page keys or a growing value for
 *          no user-visible gain. Revisit if revisiting a deep scroll matters.
 */
export function episodesCacheKey(podcastId: number): string {
  return `podplayer.cache.episodes.${podcastId}`;
}

type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

/**
 * Reads a cache entry.
 *
 * @returns the stored value and the epoch millisecond it was written, or
 *          `null` on any miss: no entry, unavailable storage, or a value that
 *          is not a cache entry. A miss and a broken read are the same thing to
 *          the caller, so they are not distinguished.
 */
export function getCached<T>(key: string): { value: T; storedAt: number } | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const entry = JSON.parse(raw) as Partial<CacheEntry<T>> | null;
    if (entry === null || typeof entry !== "object" || typeof entry.storedAt !== "number") {
      return null;
    }
    return { value: entry.value as T, storedAt: entry.storedAt };
  } catch {
    // Storage disabled or full, or a non-JSON value another tab wrote.
    return null;
  }
}

/**
 * Writes a cache entry, stamped with the current time.
 *
 * Never throws: a full quota or disabled storage drops the write, which costs
 * only a later miss. A cache must not be able to crash the app.
 */
export function setCached<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const entry: CacheEntry<T> = { value, storedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Silent by design. See the docstring.
  }
}

/**
 * Returns the cached value synchronously and starts the fetch in parallel.
 *
 * The caller renders `cached` at once (or falls through when it is `null`) and
 * replaces it when `fresh` resolves. The fetch is unconditional: a `null` cache
 * still fetches, and so does a value the previous mount already wrote, so the
 * rendered data converges on the server's answer on every mount. The cache is
 * returned regardless of age; a future change that cares about staleness can add
 * a window back here.
 */
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): { cached: T | null; fresh: Promise<T> } {
  const entry = getCached<T>(key);
  const cached = entry ? entry.value : null;

  /*
   * The write happens on success only. A rejected fetch must not overwrite a
   * good cached value with an error.
   */
  const fresh = fetcher().then((value) => {
    setCached(key, value);
    return value;
  });

  return { cached, fresh };
}
