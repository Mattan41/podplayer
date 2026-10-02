"use client";

import { usePlayer } from "@/lib/player-context";
import { BaseButton } from "@/components/base";
import FullPlayer from "./full-player";
import Scrubber from "./scrubber";

/**
 * The player surface, fixed at the bottom of the viewport, mounted once in
 * `frontend/app/layout.tsx` so it survives route changes.
 *
 * Two states: the bar itself while an episode is loaded (title, play/pause,
 * scrubber, expand, close), and a plain notice when the media element failed —
 * for example a `404` on the episode's `audioUrl`. In the second case the
 * episode is already `null`, so the bar is gone and only the message remains;
 * `stop` dismisses it. See docs/DECISIONS.md entry 26.
 *
 * The full player is rendered from here (rather than from the layout) so the
 * layout has a single player mount point.
 */
export default function MiniPlayer() {
  const { state, toggle, seek, stop, setFullPlayerOpen } = usePlayer();
  const { episode, status, currentTime, duration, error } = state;

  if (!episode) {
    if (!error) {
      return null;
    }
    return (
      <div
        role="status"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-fg bg-bg px-6 py-3"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm">{error}</p>
          <BaseButton variant="danger" onClick={stop}>
            Close
          </BaseButton>
        </div>
      </div>
    );
  }

  const isPlaying = status === "playing";

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-fg bg-bg px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3 sm:gap-4">
          <BaseButton
            variant="cta"
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </BaseButton>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{episode.title}</p>
            <Scrubber currentTime={currentTime} duration={duration} onSeek={seek} />
          </div>

          <BaseButton variant="outline" onClick={() => setFullPlayerOpen(true)}>
            Expand
          </BaseButton>
          <BaseButton variant="outline" aria-label="Close player" onClick={stop}>
            Close
          </BaseButton>
        </div>
      </div>

      <FullPlayer />
    </>
  );
}
