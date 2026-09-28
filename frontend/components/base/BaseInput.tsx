import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";
import { CONTROL_CLASS } from "./control";

/**
 * Single-line text input.
 *
 * Every native prop is forwarded, so `type` (`email`, `text`, `datetime-local`,
 * ...), `required`, `disabled`, `value`, `onChange` and `aria-*` pass straight
 * through. `type` is deliberately given no default: native `<input>` already
 * defaults to `text`, and defaulting here would hide the author's intent.
 *
 * `invalid` sets `aria-invalid` and switches the border to the CTA token. The
 * border stays 1px on purpose, because a 2px border would reflow the field when
 * an error appears. Reserved API: no caller uses it yet, because the admin form
 * shows one form-level error rather than per-field errors.
 */
export type BaseInputProps = ComponentPropsWithoutRef<"input"> & {
  invalid?: boolean;
};

export function BaseInput({ invalid = false, className, ...rest }: BaseInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASS, invalid && "border-cta", className)}
      {...rest}
    />
  );
}
