"use client";

import * as Slider from "@radix-ui/react-slider";
import { cn } from "./cn";

/**
 * Slider built on `@radix-ui/react-slider`, the first component that genuinely
 * needs a headless primitive (docs/DECISIONS.md entry 1). It is a client
 * component: Radix uses hooks, so importing the barrel pulls a client boundary
 * up the tree for every consumer. That is recorded in the base README.
 *
 * The track is one hairline in `fg`. The filled portion is `accent`
 * (Yellow Ochre is the documented progress fill) and the thumb is a focal
 * circle (`rounded-full`), bordered in `cta` so it is visible against both the
 * track and the canvas.
 *
 * Layout belongs to the caller: this component sets no width, so a slider in a
 * flex row needs its own `flex-1` (or `w-full`). See README.md §2.
 */
export type BaseSliderProps = {
  /** Current value. Controlled; the caller owns it. */
  value: number;
  min?: number;
  /** Radix requires `max > min`, so the caller must pass a usable range. */
  max: number;
  step?: number;
  disabled?: boolean;
  /** Fires continuously while dragging. */
  onValueChange?: (value: number) => void;
  /** Fires once when the pointer or key releases. */
  onValueCommit?: (value: number) => void;
  className?: string;
  /** Accessible name for the thumb, which is what carries `role="slider"`. */
  "aria-label"?: string;
};

export function BaseSlider({
  value,
  min = 0,
  max,
  step = 1,
  disabled = false,
  onValueChange,
  onValueCommit,
  className,
  "aria-label": ariaLabel,
}: BaseSliderProps) {
  return (
    <Slider.Root
      className={cn("relative flex touch-none select-none items-center", className)}
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(values) => onValueChange?.(values[0] ?? min)}
      onValueCommit={(values) => onValueCommit?.(values[0] ?? min)}
    >
      <Slider.Track className="relative h-px grow bg-fg">
        <Slider.Range className="absolute h-px bg-accent" />
      </Slider.Track>
      <Slider.Thumb
        aria-label={ariaLabel}
        className="block h-4 w-4 rounded-full border-2 border-cta bg-bg focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-not-allowed disabled:opacity-50"
      />
    </Slider.Root>
  );
}
