import { apiFetch } from "@/lib/api";

/*
 * Types and wrappers for the two endpoints in docs/api/playback.md.
 *
 * The types mirror the backend's `PlaybackStateDto` and
 * `PlaybackStateUpdateRequest` field for field: when one side changes, change
 * both in the same commit. That rule is ARCHITECTURE.md §5 rule 8, "Contract
 * First".
 *
 * Both calls go through `apiFetch`, which attaches the Supabase access token
 * and throws `Error("Not authenticated")` when there is no session. There is no
 * second HTTP layer.
 */

/** Mirrors the backend's `PlaybackStateDto`. */
export type PlaybackStateDto = {
  episodeId: number;
  positionSeconds: number;
  playedAt: string;
  completed: boolean;
};

/** Mirrors the backend's `PlaybackStateUpdateRequest`. */
export type PlaybackStateUpdateRequest = {
  positionSeconds: number;
  completed: boolean;
};

/**
 * A playback request the backend refused, carrying the status.
 *
 * It mirrors `PodcastApiError` in `lib/api/podcast.ts`. The two are kept
 * separate rather than sharing a base class: there are only two, each module
 * stays self-contained, and a shared `lib/api/error.ts` would add a module
 * without removing a class. Extract it if a third API module needs the same
 * `messageFrom` and error shape.
 *
 * `message` is the backend's own `ProblemDetail.detail` when the body has one.
 */
export class PlaybackApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PlaybackApiError";
    this.status = status;
  }
}

/**
 * Reads the message out of a failed response.
 *
 * Spring answers with a problem body and `detail` is the short reason the API
 * documents. A body that is absent, HTML, or not JSON at all falls back to the
 * status alone, which is what a proxy or a network middlebox produces.
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
 * Reads the caller's stored position for an episode.
 *
 * A `404` is not an error: it is the backend's answer for an episode the user
 * has not started, and it is turned into `null` without reading the body, so a
 * caller starts at 0.
 *
 * @param episodeId the episode whose stored position is wanted
 * @returns the stored state, or `null` when none is stored
 * @throws PlaybackApiError on any other non-OK status
 * @throws Error "Not authenticated" when there is no session
 */
export async function getPosition(episodeId: number): Promise<PlaybackStateDto | null> {
  const response = await apiFetch(`/api/playback/${episodeId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new PlaybackApiError(response.status, await messageFrom(response));
  }
  return (await response.json()) as PlaybackStateDto;
}

/**
 * Stores the caller's position for an episode. The backend upserts, so the
 * first call creates the row and later ones overwrite it.
 *
 * @param episodeId the episode being reported on
 * @param positionSeconds the position to store; the backend rejects a negative one
 * @param completed whether playback reached the end of the episode
 * @returns the stored state after the write
 * @throws PlaybackApiError on any non-OK status
 * @throws Error "Not authenticated" when there is no session
 */
export async function savePosition(
  episodeId: number,
  positionSeconds: number,
  completed: boolean,
): Promise<PlaybackStateDto> {
  const body: PlaybackStateUpdateRequest = { positionSeconds, completed };
  const response = await apiFetch(`/api/playback/${episodeId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new PlaybackApiError(response.status, await messageFrom(response));
  }
  return (await response.json()) as PlaybackStateDto;
}
