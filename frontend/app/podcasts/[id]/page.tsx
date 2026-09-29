import EpisodesView from "./episodes-view";

/**
 * Route shell for `/podcasts/[id]`.
 *
 * A server component for one reason only: `generateStaticParams` cannot live in
 * a file that declares `"use client"`, and Next.js refuses a page that tries to
 * do both — "App pages cannot use both \"use client\" and export function
 * \"generateStaticParams()\"". Everything the page does belongs to
 * {@link EpisodesView}, which is a client component because it fetches on mount.
 */
export function generateStaticParams(): { id: string }[] {
  /*
   * One placeholder, because "output: export" refuses an empty list: at least
   * one route must be generated. "0" can never be a real podcast — ids start at
   * 1 — so what is generated is a shell no visitor is meant to land on, and the
   * component renders "Podcast not found" if one does.
   *
   * The real ids are assigned by the database when a feed is first subscribed
   * to, so they cannot be enumerated here. What serves a deep link such as
   * /podcasts/42 is therefore not this function but the host's 404 handling:
   * see docs/DECISIONS.md entry 18, which measures which 404.html actually
   * ships in the export.
   */
  return [{ id: "0" }];
}

export default function EpisodesPage() {
  return <EpisodesView />;
}
