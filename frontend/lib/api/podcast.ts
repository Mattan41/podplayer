import { apiFetch } from "@/lib/api";

/*
 * Types and wrappers for the four endpoints in docs/api/podcasts.md.
 *
 * Both the types and the calls live in this one file (Phase C roadmap), and the
 * types mirror the backend DTOs field for field: when one side changes, change
 * both in the same commit. That rule is ARCHITECTURE.md §5 rule 8, "Contract
 * First".
 *
 * Every wrapper goes through `apiFetch`, which attaches the Supabase access
 * token and throws `Error("Not authenticated")` when there is no session. No
 * second HTTP layer exists.
 */

export type PodcastDto = {
  id: number;
  title: string;
  author: string | null;
  imageUrl: string | null;
  feedUrl: string;
  lastFetchedAt: string | null;
  episodeCount: number;
};

export type PodcastSummaryDto = {
  podcastId: number;
  title: string;
  author: string | null;
  imageUrl: string | null;
  feedUrl: string;
  lastFetchedAt: string | null;
  subscribedAt: string;
  episodeCount: number;
};

export type EpisodeDto = {
  id: number;
  guid: string;
  title: string;
  description: string | null;
  audioUrl: string;
  publishedAt: string | null;
  durationSeconds: number | null;
  imageUrl: string | null;
};

/*
 * One page of an episode list. Mirrors the backend's `EpisodePageDto`, which
 * wraps the episodes rather than returning a bare array so the client gets the
 * total and whether another page exists in the same response. `page` is
 * zero-based and `size` is the size the backend actually used. See
 * docs/api/podcasts.md.
 */
export type EpisodePageDto = {
  episodes: EpisodeDto[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
};

export type SubscribeResult = {
  podcast: PodcastDto;
  alreadySubscribed: boolean;
};

export type RefreshResult = {
  podcast: PodcastDto;
  addedEpisodes: number;
};

/**
 * A response the podcast API refused, carrying the status.
 *
 * The status is on the error rather than in a return value because the two
 * pages need different things from the same call: the list only wants a
 * sentence to show, while the episode page has to tell `403` (follow this
 * podcast to read it) from `404` (no such podcast) to pick which message, and
 * which way back, to render.
 *
 * `message` is the backend's own `ProblemDetail.detail` when the body has one,
 * which for a rejected feed URL is the reason the fetch failed, so the text is
 * worth showing verbatim.
 */
export class PodcastApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PodcastApiError";
    this.status = status;
  }
}

/**
 * Reads the message out of a failed response.
 *
 * Spring answers with a problem body (`type`, `title`, `status`, `detail`,
 * `instance`) and `detail` is the short reason the API documents. A body that
 * is absent, HTML, or not JSON at all falls back to the status alone, which is
 * what a proxy or a network middlebox produces.
 */
async function messageFrom(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown; title?: unknown };
    if (typeof body.detail === "string" && body.detail.length > 0) {
      return body.detail;
    }
    if (typeof body.title === "string" && body.title.length > 0) {
      return body.title;
    }
  } catch {
    // Not a JSON body. Fall through to the status message.
  }
  return `Request failed with status ${response.status}`;
}

/**
 * @returns the podcasts the signed-in user follows, ordered by title
 * @throws PodcastApiError when the backend refuses the request
 * @throws Error "Not authenticated" when there is no session
 */
export async function listSubscriptions(): Promise<PodcastSummaryDto[]> {
  const response = await apiFetch("/api/podcasts");
  if (!response.ok) {
    throw new PodcastApiError(response.status, await messageFrom(response));
  }
  return (await response.json()) as PodcastSummaryDto[];
}

/**
 * Subscribes the signed-in user to a feed and imports its episodes.
 *
 * @param feedUrl absolute `http` or `https` URL of an RSS or Atom feed
 * @returns the stored podcast, and whether the user was already following it
 * @throws PodcastApiError when the backend refuses the request; `400` for a URL
 *         that is not a feed, `502` when the feed host cannot be reached
 * @throws Error "Not authenticated" when there is no session
 */
export async function subscribe(feedUrl: string): Promise<SubscribeResult> {
  const response = await apiFetch("/api/podcasts", {
    method: "POST",
    body: JSON.stringify({ feedUrl }),
  });
  if (!response.ok) {
    throw new PodcastApiError(response.status, await messageFrom(response));
  }
  return (await response.json()) as SubscribeResult;
}

/**
 * @param podcastId the podcast whose episodes are wanted
 * @param page the zero-based page to read, defaulting to the first page
 * @param size the page size, defaulting to the backend's 50
 * @returns one page of the podcast's episodes, newest first, with the total
 * @throws PodcastApiError when the backend refuses the request; `403` when the
 *         user does not follow the podcast, `404` when it does not exist
 * @throws Error "Not authenticated" when there is no session
 */
export async function listEpisodes(
  podcastId: number,
  page = 0,
  size = 50,
): Promise<EpisodePageDto> {
  const response = await apiFetch(
    `/api/podcasts/${podcastId}/episodes?page=${page}&size=${size}`,
  );
  if (!response.ok) {
    throw new PodcastApiError(response.status, await messageFrom(response));
  }
  return (await response.json()) as EpisodePageDto;
}

/**
 * Re-reads the feed and imports anything new.
 *
 * @param podcastId the podcast to refresh
 * @returns the podcast after the refresh, and how many episodes were added
 * @throws PodcastApiError when the backend refuses the request; `404` when the
 *         podcast does not exist, `502` when the feed host cannot be reached
 * @throws Error "Not authenticated" when there is no session
 */
export async function refreshPodcast(podcastId: number): Promise<RefreshResult> {
  const response = await apiFetch(`/api/podcasts/${podcastId}/refresh`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new PodcastApiError(response.status, await messageFrom(response));
  }
  return (await response.json()) as RefreshResult;
}
