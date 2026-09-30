import {
  listEpisodes,
  listSubscriptions,
  refreshPodcast,
  subscribe,
} from "@/lib/api/podcast";
import type { PodcastSource } from "@/lib/podcast-source";

/**
 * The real {@link PodcastSource}: a pass-through to the wrappers in
 * `lib/api/podcast.ts`.
 *
 * It adds nothing of its own — no retry, no cache, no error mapping — because
 * those decisions belong to the caller or to a decorator around this object.
 * The four functions are assigned directly rather than wrapped, so their
 * signatures cannot drift from the interface without a type error.
 */
export const remotePodcastSource: PodcastSource = {
  listSubscriptions,
  subscribe,
  listEpisodes,
  refreshPodcast,
};
