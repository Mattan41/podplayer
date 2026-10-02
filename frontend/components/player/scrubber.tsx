"use client";

import { useState } from "react";
import { BaseSlider } from "@/components/base";

/**
 * A duration as `m:ss`, or `h:mm:ss` past an hour.
 *
 * Digits are tabular (`tabular-nums`) so the readouts do not shift as the
 * seconds tick, per ARCHITECTURE.md §4.3.
 */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const ss = String(secs).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

export type ScrubberProps = {
  currentTime: number;
  duration: number;
  /** Called once, on release, with the second the caller should seek to. */
  onSeek: (seconds: number) => void;
};

/**
 * The seek control shared by the mini and full players: a `BaseSlider` with an
 * elapsed and a total readout on either side. See docs/DECISIONS.md entry 27.
 *
 * While the thumb is dragged the elapsed readout follows the pointer through
 * local preview state, and the audio is seeked only on release. Feeding the
 * preview back into the slider's `value` is what lets a controlled Radix Slider
 * move its thumb at all; seeking on every change would issue a burst of
 * `currentTime` writes.
 *
 * Until metadata arrives the duration is unknown, so the slider is disabled and
 * the track is given a placeholder range of `1`.
 */
export default function Scrubber({ currentTime, duration, onSeek }: ScrubberProps) {
  const [preview, setPreview] = useState<number | null>(null);

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const max = hasDuration ? duration : 1;
  const committed = Math.min(Math.max(currentTime, 0), max);
  const displayed = preview ?? committed;

  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-right font-mono text-xs text-muted tabular-nums">
        {formatTime(displayed)}
      </span>
      <BaseSlider
        aria-label="Seek"
        className="flex-1"
        min={0}
        max={max}
        step={1}
        disabled={!hasDuration}
        value={displayed}
        onValueChange={setPreview}
        onValueCommit={(value) => {
          setPreview(null);
          onSeek(value);
        }}
      />
      <span className="w-12 shrink-0 font-mono text-xs text-muted tabular-nums">
        {formatTime(hasDuration ? duration : 0)}
      </span>
    </div>
  );
}