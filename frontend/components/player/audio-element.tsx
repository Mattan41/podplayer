"use client";

import { usePlayer } from "@/lib/player-context";

/**
 * The one media element for the whole app.
 *
 * Rendered once, in `frontend/app/layout.tsx`, so a route change cannot unmount
 * it and interrupt playback. `PlayerProvider` owns the shared ref and drives
 * `src` and playback imperatively; this component only binds the native media
 * events back to the reducer. It renders no UI and carries no `controls`, so
 * the mini and full players are the only controls.
 *
 * `preload="metadata"` fetches just enough of the source to learn its duration.
 * See docs/DECISIONS.md entry 26.
 */
export default function AudioElement() {
  const {
    audioRef,
    handleLoadedMetadata,
    handleTimeUpdate,
    handlePlaying,
    handlePause,
    handleEnded,
    handleError,
  } = usePlayer();

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onPlaying={handlePlaying}
      onPause={handlePause}
      onEnded={handleEnded}
      onError={handleError}
    />
  );
}
