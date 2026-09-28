import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

export type BaseButtonVariant = "outline" | "cta" | "danger";
export type BaseButtonSize = "sm" | "md";

/**
 * Geometry and states shared by every variant. Callers add layout classes only
 * (`w-full`, `mt-6`); they never override padding, border weight or font size.
 *
 * Focus is restyled, never removed. Vermilion is used rather than Yellow Ochre
 * because Yellow Ochre on the light background measures 2.30:1, below the 3:1
 * that WCAG 1.4.11 asks of non-text contrast; Vermilion measures 4.27:1 in light
 * mode and 4.99:1 in dark mode. See docs/DECISIONS.md entry 5, and entry 8 for
 * why focus-visible:outline-solid is required for the ring to be painted at all.
 */
const BASE_CLASS =
  "cursor-pointer rounded-base font-mono tracking-wide transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Complete class strings per variant. No partial overrides: a caller that needs
 * different appearance needs a different variant (see README.md).
 */
const VARIANT_CLASS: Record<BaseButtonVariant, string> = {
  outline: "border border-fg text-fg hover:bg-fg hover:text-bg",
  cta: "border-2 border-cta bg-cta text-bg hover:bg-bg hover:text-cta",
  danger: "border border-cta text-cta hover:bg-cta hover:text-bg",
};

const SIZE_CLASS: Record<BaseButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-6 py-3 text-sm",
};

export type BaseButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: BaseButtonVariant;
  size?: BaseButtonSize;
};

export function BaseButton({
  variant = "outline",
  size = "sm",
  type = "button",
  className,
  ...rest
}: BaseButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...rest}
    />
  );
}
