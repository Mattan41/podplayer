import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";
import { CONTROL_CLASS } from "./control";

/**
 * Native select, styled with the same box as BaseInput.
 *
 * A native element is used instead of a Radix Select: it brings no dependency and
 * keeps full keyboard, screen-reader and mobile-picker behaviour. The option list
 * itself is rendered by the browser and cannot be styled. See docs/DECISIONS.md
 * entry 2.
 *
 * `invalid` behaves exactly as it does on BaseInput, including the 1px border.
 */
export type BaseSelectProps = ComponentPropsWithoutRef<"select"> & {
  invalid?: boolean;
};

export function BaseSelect({ invalid = false, className, ...rest }: BaseSelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASS, invalid && "border-cta", className)}
      {...rest}
    />
  );
}
