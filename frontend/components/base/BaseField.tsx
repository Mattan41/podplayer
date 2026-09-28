import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Labels a single form control in the standard stacked layout: a muted caption
 * above the control.
 *
 * The control is wrapped by the `<label>` rather than referenced through
 * `htmlFor`, which gives an implicit label association with no id plumbing. See
 * README.md, "Label association", for the trade-off and the escape hatch.
 */
export type BaseFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function BaseField({ label, children, className }: BaseFieldProps) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}
