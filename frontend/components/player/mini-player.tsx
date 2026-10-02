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
 * scrubber, expand), and a plain notice when the media element failed — for
 * example a `404` on the episode's `audioUrl`. In the second case the episode
 * is already `null`, so the bar is gone and only the message remains; `stop`
 * dismisses it. See docs/DECISIONS.md entry 26.
 *
 * The bar has no close control: clearing the player is rare, and the episode is
 * meant to stay loaded until the next one plays. Only the error notice keeps a
 * Close, because it dismisses a failure rather than a player.
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-fg bg-bg px-6 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]"
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
      {/*
        Two lines, deliberately, at every width. On one line the controls (play,
        Expand) leave the middle only ~90px on a 375px viewport, while the
        scrubber's two fixed readouts and their gaps need ~120px; the slider was
        squeezed to zero and the total readout ran under the buttons. Controls
        are fixed-width (`shrink-0`) and the title truncates (`min-w-0`), and the
        scrubber gets a full-width line of its own. See the fix report.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-fg bg-bg px-6 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <BaseButton
              variant="cta"
              className="shrink-0"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "Pause" : "Play"}
            </BaseButton>

            <p className="min-w-0 flex-1 truncate text-sm">{episode.title}</p>

            <BaseButton
              variant="outline"
              className="shrink-0"
              onClick={() => setFullPlayerOpen(true)}
            >
              Expand
            </BaseButton>
          </div>

          <Scrubber currentTime={currentTime} duration={duration} onSeek={seek} />
        </div>
      </div>

      <FullPlayer />
    </>
  );
}
