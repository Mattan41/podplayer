import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Surface primitive: a sharp-cornered, bordered panel.
 *
 * Owns no padding, width, height or margin, so the caller composes the box:
 *
 * ```tsx
 * <BaseCard className="p-6">...</BaseCard>
 * ```
 *
 * Separation is expressed with a 1px border rather than a shadow, per
 * ARCHITECTURE.md §4.4 ("Zero Box Shadows").
 */
export type BaseCardProps = {
  children: ReactNode;
  className?: string;
};

export function BaseCard({ children, className }: BaseCardProps) {
  return <div className={cn("rounded-none border border-fg bg-bg", className)}>{children}</div>;
}
