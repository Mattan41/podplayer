import { Suspense } from "react";
import EpisodesView from "./episodes-view";

/**
 * Route shell for `/podcasts/view`.
 *
 * The podcast id travels as a query parameter (`/podcasts/view?id=42`) rather
 * than as a path segment. A static export writes one HTML file per route, so
 * the previous dynamic segment could never serve an id the build did not know
 * about — and the ids are assigned by the database on first subscription, so
 * the build cannot know them. GitHub Pages serves files, not rewrites, so a
 * query parameter on a single static route is what resolves for every id.
 *
 * A server component wrapping the client child for one reason only:
 * `useSearchParams` in {@link EpisodesView} needs a Suspense boundary so that
 * Next can prerender this shell while the client supplies the id.
 */
export default function EpisodesPage() {
  return (
    <Suspense>
      <EpisodesView />
    </Suspense>
  );
}
