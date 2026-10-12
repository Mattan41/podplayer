"use client";

import { useEffect } from "react";

/**
 * How far the lock-screen and headphone skip controls jump, in seconds.
 *
 * Fifteen is the value both Android and iOS use for podcast skip-back, so the
 * hardware controls match the platform's own default rather than inventing a
 * number. See docs/DECISIONS.md entry 44.
 */
export const MEDIA_SESSION_SEEK_STEP_SECONDS = 15;

export type MediaSessionControls = {
  /** Episode title, or `null` to clear the session metadata. */
  title: string | null;
  /** Episode artwork URL, or `null` when the feed supplied none. */
  artwork: string | null;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  /** Moves playback by `deltaSeconds`, clamped to the episode by the caller. */
  seekRelative: (deltaSeconds: number) => void;
};

function getMediaSession(): MediaSession | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  return navigator.mediaSession ?? null;
}

/**
 * Binds the player to the OS media controls (lock screen, notification shade,
 * headphone buttons).
 *
 * Three independent concerns, each in its own effect:
 *
 * 1. Metadata follows the episode, so the lock screen shows the title and the
 *    artwork. The artwork is the episode's feed URL, fetched by the OS rather
 *    than the page; see docs/DECISIONS.md entry 44 for why that is a different
 *    path from the in-page `<img>`.
 * 2. Action handlers are registered once. Each is guarded because a browser
 *    throws for an action it does not support, and the cleanup clears them.
 * 3. Position state follows the same `[currentTime, duration]` cadence as the
 *    scrubber, so the lock-screen progress bar tracks playback.
 *
 * The hook is inert where the Media Session API is absent: it reads
 * `navigator.mediaSession` once per effect and returns, so the player works
 * unchanged on a browser without it.
 */
export function useMediaSession({
  title,
  artwork,
  currentTime,
  duration,
  play,
  pause,
  seekRelative,
}: MediaSessionControls): void {
  useEffect(() => {
    const session = getMediaSession();
    if (!session || typeof MediaMetadata === "undefined") {
      return;
    }
    if (title === null) {
      session.metadata = null;
      return;
    }
    session.metadata = new MediaMetadata({
      title,
      artwork: artwork ? [{ src: artwork }] : [],
    });
  }, [title, artwork]);

  useEffect(() => {
    const session = getMediaSession();
    if (!session) {
      return;
    }
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => play()],
      ["pause", () => pause()],
      ["seekbackward", () => seekRelative(-MEDIA_SESSION_SEEK_STEP_SECONDS)],
      ["seekforward", () => seekRelative(MEDIA_SESSION_SEEK_STEP_SECONDS)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // The browser does not support this action; leave it unregistered.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Already unsupported; nothing to clear.
        }
      }
    };
  }, [play, pause, seekRelative]);

  useEffect(() => {
    const session = getMediaSession();
    if (!session || duration <= 0) {
      return;
    }
    const position = Math.min(Math.max(currentTime, 0), duration);
    try {
      session.setPositionState({ duration, playbackRate: 1, position });
    } catch {
      // A duration or position the API rejects is not worth surfacing.
    }
  }, [currentTime, duration]);
}
