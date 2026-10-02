"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "./cn";

/**
 * Modal dialog built on `@radix-ui/react-dialog` (docs/DECISIONS.md entry 1).
 *
 * Radix owns the behaviour this project does not want to write by hand: the
 * focus trap, Escape-to-close, focus restoration, scroll locking and the
 * `aria-modal` wiring. The base layer owns the appearance, and the full player
 * is its only consumer in this phase (docs/DECISIONS.md entry 27).
 *
 * The scrim is a solid `fg` fill rather than a translucent one: the palette has
 * no overlay token, and an opacity utility on `fg` is banned by lint
 * (docs/DECISIONS.md entry 7). A full-bleed scrim also reads as the "expands
 * over the current view" behaviour the player wants, on brand with a system
 * built on hard boundaries rather than soft depth.
 *
 * It is a client component because Radix uses hooks; see the base README for
 * the client-boundary consequence.
 */
export type BaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered as `Dialog.Title`, which Radix requires for an accessible name. */
  title: string;
  children: ReactNode;
  className?: string;
};

export function BaseDialog({ open, onOpenChange, title, children, className }: BaseDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-fg" />
        <Dialog.Content
          /* No description element is rendered, so the association is dropped
             explicitly; otherwise Radix warns at runtime. */
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-base border-2 border-fg bg-bg p-6",
            className,
          )}
        >
          <Dialog.Title className="font-mono text-lg">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
