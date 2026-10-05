"use client";

import type { ReactNode } from "react";
import { usePlayer } from "@/lib/player-context";

/**
 * Reserves space for the fixed player bar under every route's content.
 *
 * The player surface is `position: fixed` at the bottom of the viewport (see
 * docs/DECISIONS.md entry 26), so it paints over the end of the page. Whether
 * the bar is up is global state, not a per-page fact, so one wrapper owns the
 * reservation rather than every page repeating a conditional `pb-24` — which is
 * what `episodes-view.tsx` did, and what the next page would otherwise have to
 * do again.
 *
 * It renders the layout's `{children}` and adds bottom padding only while the
 * bar is up: the mini player when an episode is loaded, or the error notice when
 * one failed. Nothing else about the page changes.
 *
 * It is a client component because it reads `usePlayer()`, but it stays a child
 * of the server `layout.tsx`, so the client boundary covers the page content and
 * not the document. The padding is deliberately not on `<body>`: an effect in
 * `layout.tsx` would push the client boundary up over the header and the rest of
 * the tree.
 */
export default function PlayerAwareMain({ children }: { children: ReactNode }) {
  const { state } = usePlayer();
  const hasPlayerBar = state.episode !== null || state.error !== null;

  return (
    <div className={`flex flex-1 flex-col ${hasPlayerBar ? "pb-24" : ""}`}>
      {children}
    </div>
  );
}
