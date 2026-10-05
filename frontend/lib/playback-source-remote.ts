import { getPosition, savePosition } from "@/lib/api/playback";
import type { PlaybackSource } from "@/lib/playback-source";

/**
 * The real {@link PlaybackSource}: a pass-through to the wrappers in
 * `lib/api/playback.ts`.
 *
 * It adds nothing of its own — no retry, no cache, no error mapping — because
 * those decisions belong to the caller or to a decorator around this object.
 * The two functions are assigned directly rather than wrapped, so their
 * signatures cannot drift from the interface without a type error.
 */
export const remotePlaybackSource: PlaybackSource = {
  getPosition,
  savePosition,
};
