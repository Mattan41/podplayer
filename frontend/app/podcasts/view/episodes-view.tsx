"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PodcastApiError, type EpisodeDto, type PodcastSummaryDto } from "@/lib/api/podcast";
import { usePodcastSource } from "@/lib/podcast-source";
import { usePlayer } from "@/lib/player-context";
import {
  episodesCacheKey,
  setCached,
  SUBSCRIPTIONS_CACHE_KEY,
  withCache,
} from "@/lib/podcast-cache";
import { BaseButton, BaseCard } from "@/components/base";

const SIGN_IN_ERROR = "Sign in to see this podcast.";
const LOAD_ERROR = "Could not load the episodes.";
const LOAD_MORE_ERROR = "Could not load more episodes.";
const REFRESH_ERROR = "Could not refresh the feed.";
const NOT_SUBSCRIBED_ERROR = "You are not subscribed to this podcast";
const NOT_FOUND_ERROR = "Podcast not found";

/** Matches the backend's default page size, so the "load more" step is one page. */
const EPISODE_PAGE_SIZE = 50;

/** apiFetch throws this exact message when there is no Supabase session. */
function isNotAuthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

/**
 * One sentence for a failed call.
 *
 * The backend's own reason wins when there is one: `PodcastApiError` carries
 * `ProblemDetail.detail`, which for a feed that cannot be read is the reason.
 * A missing session and a network that never answered get a sentence of their
 * own, because neither produces a response to read.
 */
function describeError(error: unknown, fallback: string): string {
  if (isNotAuthenticated(error)) {
    return SIGN_IN_ERROR;
  }
  if (error instanceof PodcastApiError) {
    return error.message;
  }
  return fallback;
}

/**
 * A duration as `1 h 23 m`, `45 m`, or `38 s` under a minute.
 *
 * @returns the formatted duration, or `null` when the feed supplied none, so
 *          the caller leaves the separator out entirely
 */
function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) {
    return null;
  }
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) {
    return `${seconds} s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${totalMinutes} m`;
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} m`;
}

function formatPublishedAt(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "No date";
}

/** Wording for `RefreshResult.addedEpisodes`, which is 0 in the steady state. */
function describeAddedEpisodes(count: number): string {
  if (count === 0) {
    return "No new episodes.";
  }
  return count === 1 ? "1 new episode." : `${count} new episodes.`;
}

/**
 * The episode list for one podcast.
 *
 * A client component because the whole page is a fetch on mount. It is rendered
 * by the server component in `page.tsx`, which wraps it in a Suspense boundary
 * so `useSearchParams` can be read while the shell is prerendered.
 *
 * The podcast id comes from the query string (`/podcasts/view?id=42`) rather
 * than from a path segment, because a static export can only emit one file per
 * route and the ids are not known at build time. An id that is missing or not a
 * positive integer reads as "Podcast not found".
 */
export default function EpisodesView() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id");
  const podcastId = Number(rawId);
  /*
   * `Number(null)` and `Number("")` are both 0, so a missing or empty id fails
   * the positive-integer test without a separate null check.
   */
  const isValidId = Number.isInteger(podcastId) && podcastId > 0;

  const source = usePodcastSource();
  const { state, playEpisode } = usePlayer();

  /*
   * The player surface is a fixed bar at the bottom of the viewport, so when it
   * is up the page reserves its height and the "Load more" button is never
   * covered. `pb-24` (96px) is chosen over the bar's measured 81px to leave a
   * small gap; see the fix report, item 1. The error notice is the same fixed
   * bar, so it counts too.
   */
  const hasPlayerBar = state.episode !== null || state.error !== null;

  const [episodes, setEpisodes] = useState<EpisodeDto[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<"not-subscribed" | "not-found" | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isShowingCached, setIsShowingCached] = useState(false);
  const [podcast, setPodcast] = useState<PodcastSummaryDto | null>(null);

  useEffect(() => {
    if (!isValidId) {
      // Nothing to ask for. The render path below is what shows "not found",
      // because calling setState synchronously in an effect body would cascade
      // an extra render (react-hooks/set-state-in-effect).
      return;
    }

    let isCancelled = false;

    const key = episodesCacheKey(podcastId);
    /*
     * Only the first page is cached. `loadMore` appends later pages in memory.
     */
    const { cached, fresh } = withCache(key, () =>
      source.listEpisodes(podcastId, 0, EPISODE_PAGE_SIZE),
    );

    const load = async () => {
      /*
       * The cached first page paints before the network answers, when there is
       * one. Kept in the async load rather than directly in the effect body:
       * react-hooks/set-state-in-effect rejects the direct form, and this is
       * where the effect already performs its state updates.
       */
      if (cached !== null) {
        setEpisodes(cached.episodes);
        setPage(cached.page);
        setTotal(cached.total);
        setHasMore(cached.hasMore);
        setBlocked(null);
        setIsLoading(false);
      }

      try {
        const loaded = await fresh;
        if (!isCancelled) {
          setEpisodes(loaded.episodes);
          setPage(loaded.page);
          setTotal(loaded.total);
          setHasMore(loaded.hasMore);
          setBlocked(null);
          setError(null);
          setIsShowingCached(false);
        }
      } catch (loadError) {
        if (isCancelled) {
          return;
        }
        // 403 and 404 are views of their own rather than error sentences: one
        // offers a way back to the list, the other says what is missing. They
        // outrank the cache: a podcast the caller cannot read is not shown from
        // a stale copy.
        if (loadError instanceof PodcastApiError && loadError.status === 403) {
          setBlocked("not-subscribed");
        } else if (loadError instanceof PodcastApiError && loadError.status === 404) {
          setBlocked("not-found");
        } else if (cached !== null && !isNotAuthenticated(loadError)) {
          // Network or server failure with a cached list: keep it and say so.
          setIsShowingCached(true);
        } else {
          setError(describeError(loadError, LOAD_ERROR));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [podcastId, isValidId, source]);

  /*
   * The cover, title and author are properties of the subscription, not of the
   * episode page: `EpisodePageDto` carries only episodes. They are read from the
   * subscription list, through the same cache the library writes, so a second
   * visit in the same session paints the cover from localStorage. A miss (the
   * user is not subscribed, so `listEpisodes` will answer 403 anyway) or a
   * failure renders nothing: the cover is decoration, the list is the content.
   */
  useEffect(() => {
    if (!isValidId) {
      return;
    }

    let isCancelled = false;

    const { cached, fresh } = withCache(SUBSCRIPTIONS_CACHE_KEY, () =>
      source.listSubscriptions(),
    );
    const pick = (list: PodcastSummaryDto[]) =>
      list.find((item) => item.podcastId === podcastId) ?? null;

    const load = async () => {
      if (cached !== null) {
        setPodcast(pick(cached));
      }
      try {
        const list = await fresh;
        if (!isCancelled) {
          setPodcast(pick(list));
        }
      } catch {
        /*
         * Swallowed on purpose. The cover is decoration; the episode list
         * reports its own failures, and its 403 already drives the "not
         * subscribed" view. A failed subscription read must not blank the page.
         */
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [podcastId, isValidId, source]);

  const refresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setRefreshMessage(null);
    try {
      const result = await source.refreshPodcast(podcastId);
      setRefreshMessage(describeAddedEpisodes(result.addedEpisodes));
      /*
       * The refresh endpoint answers with a count, not the episodes. Read the
       * first page once more and overwrite the cache with it, so the next mount
       * of this page is instant instead of stale. This also resets the list to
       * page 0: the feed may have new episodes at the top, and a half-scrolled
       * page mixing two reads would be worse than starting over.
       */
      const reloaded = await source.listEpisodes(podcastId, 0, EPISODE_PAGE_SIZE);
      setCached(episodesCacheKey(podcastId), reloaded);
      setEpisodes(reloaded.episodes);
      setPage(reloaded.page);
      setTotal(reloaded.total);
      setHasMore(reloaded.hasMore);
      setBlocked(null);
      setIsShowingCached(false);
    } catch (refreshError) {
      setError(describeError(refreshError, REFRESH_ERROR));
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMore = async () => {
    setIsLoadingMore(true);
    setError(null);
    try {
      const next = await source.listEpisodes(podcastId, page + 1, EPISODE_PAGE_SIZE);
      setEpisodes((previous) => [...previous, ...next.episodes]);
      setPage(next.page);
      setTotal(next.total);
      setHasMore(next.hasMore);
    } catch (loadMoreError) {
      setError(describeError(loadMoreError, LOAD_MORE_ERROR));
    } finally {
      setIsLoadingMore(false);
    }
  };

  /*
   * Derived during render, not set in the effect: an id that is missing or not
   * a positive integer can never reach the backend, and it should read as "not
   * found" rather than as an error sentence.
   */
  const blockedReason = !isValidId ? "not-found" : blocked;

  if (blockedReason) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <BaseCard className="w-full max-w-md p-8">
          <h1 className="font-mono text-2xl">
            {blockedReason === "not-subscribed" ? "Not subscribed" : "Not found"}
          </h1>
          <p className="mt-2 text-sm">
            {blockedReason === "not-subscribed" ? NOT_SUBSCRIBED_ERROR : NOT_FOUND_ERROR}
          </p>
          <Link
            href="/podcasts"
            className="mt-6 inline-block font-mono text-xs tracking-wide text-fg underline underline-offset-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Back to your podcasts
          </Link>
        </BaseCard>
      </main>
    );
  }

  return (
    <main className={`flex flex-1 flex-col gap-8 p-8 ${hasPlayerBar ? "pb-24" : ""}`}>
      {podcast ? (
        /*
         * The podcast's own identity, matching the thumbnail the library list
         * shows per podcast. A plain <img>: the cover lives on whichever host
         * publishes the feed. The thumbnail is decorative because the title
         * sits next to it, hence the empty alt.
         */
        <BaseCard className="flex items-center gap-4 p-6">
          {podcast.imageUrl ? (
            <img
              src={podcast.imageUrl}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-base border border-fg object-cover"
            />
          ) : null}

          <div className="min-w-0">
            <p className="truncate">{podcast.title}</p>
            {podcast.author ? (
              <p className="mt-1 truncate text-sm text-muted">{podcast.author}</p>
            ) : null}
          </div>
        </BaseCard>
      ) : null}

      <BaseCard className="p-6">
        <p className="text-xs tracking-widest text-muted">Library</p>
        <h1 className="mt-2 font-mono text-2xl">Episodes</h1>
        <p className="mt-1 text-sm text-muted">
          Newest first. Reading the feed again picks up whatever it published since.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BaseButton
            variant="outline"
            size="md"
            onClick={() => void refresh()}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? "Refreshing…" : "Refresh feed"}
          </BaseButton>
          {refreshMessage ? <p className="text-sm text-muted">{refreshMessage}</p> : null}
        </div>

        {error ? <p className="mt-4 text-sm">{error}</p> : null}
      </BaseCard>

      <BaseCard>
        <div className="flex items-center justify-between border-b border-fg px-6 py-3">
          <h2 className="font-mono text-lg">Episodes</h2>
          {isLoading ? (
            <span className="text-xs text-muted">Loading…</span>
          ) : (
            <span className="text-xs text-muted">
              {total === 0 ? "None" : `${episodes.length} of ${total}`}
            </span>
          )}
        </div>

        {episodes.length === 0 && !isLoading ? (
          <p className="px-6 py-6 text-sm text-muted">This podcast has no episodes yet.</p>
        ) : (
          <ul>
            {episodes.map((episode) => {
              const duration = formatDuration(episode.durationSeconds);
              const isCurrent = state.episode?.id === episode.id;
              const isPlaying = isCurrent && state.status === "playing";
              return (
                <li key={episode.id} className="border-b border-fg px-6 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p>{episode.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatPublishedAt(episode.publishedAt)}
                        {duration ? ` · ${duration}` : ""}
                      </p>
                    </div>
                    <BaseButton
                      variant="outline"
                      size="sm"
                      onClick={() => playEpisode(episode)}
                      aria-label={isPlaying ? `Pause ${episode.title}` : `Play ${episode.title}`}
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </BaseButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore ? (
          <div className="border-t border-fg px-6 py-4">
            <BaseButton
              variant="outline"
              size="sm"
              onClick={() => void loadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </BaseButton>
          </div>
        ) : null}
      </BaseCard>

      {isShowingCached ? <p className="text-sm text-muted">Showing cached data</p> : null}
    </main>
  );
}
