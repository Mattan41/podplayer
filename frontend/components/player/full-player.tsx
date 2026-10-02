"use client";

import { usePlayer } from "@/lib/player-context";
import { BaseButton, BaseDialog } from "@/components/base";
import Scrubber from "./scrubber";

/**
 * The expanded player: a `BaseDialog` holding the large episode view.
 *
 * It is a dialog rather than a route because it opens over whatever the user is
 * already looking at, and a route change would unmount the tree the mini player
 * lives in. Radix supplies the focus trap and Escape close. See
 * docs/DECISIONS.md entry 27.
 *
 * Rendered by `MiniPlayer`, which is the player surface the layout mounts, so
 * `layout.tsx` gains exactly one player mount point.
 *
 * A plain `img`, not `next/image`: artwork lives on whichever host publishes
 * the feed, and the optimizer is unavailable under `output: 'export'`.
 */
export default function FullPlayer() {
  const { state, toggle, seek, setFullPlayerOpen } = usePlayer();
  const { episode, status, currentTime, duration, isFullPlayerOpen } = state;

  if (!episode) {
    return null;
  }

  const isPlaying = status === "playing";

  return (
    <BaseDialog
      open={isFullPlayerOpen}
      onOpenChange={setFullPlayerOpen}
      title={episode.title}
    >
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        {episode.imageUrl ? (
          <img
            src={episode.imageUrl}
            alt=""
            className="h-40 w-40 shrink-0 rounded-base border border-fg object-cover"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-muted">Now playing</p>
          {episode.description ? (
            <p className="mt-2 max-h-40 overflow-y-auto text-sm text-muted">
              {episode.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <Scrubber currentTime={currentTime} duration={duration} onSeek={seek} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <BaseButton
          variant="cta"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Pause" : "Play"}
        </BaseButton>
        <BaseButton variant="outline" onClick={() => setFullPlayerOpen(false)}>
          Close
        </BaseButton>
      </div>
    </BaseDialog>
  );
}
