# Phase C — Library UI

Frontend: subscription list, episode list, add-podcast form. No playback.

## Deliverables

- `frontend/lib/api/podcast.ts` — types and apiFetch wrappers for the four
  endpoints in `docs/api/podcasts.md`. Both TypeScript types and the
  wrapper functions live here; split later if the file grows past ~200
  lines.
- `frontend/app/podcasts/page.tsx` — the subscription list and the
  add-podcast form.
- `frontend/app/podcasts/view/page.tsx` — the episode list for one podcast,
  with a refresh button. The podcast id is a query parameter
  (`/podcasts/view?id=42`), not a path segment, so the route stays static.
- `frontend/app/header.tsx` — a link to /podcasts, visible only when the
  user is authenticated.
- `frontend/app/page.tsx` — the counter remains the landing page for now.
  A link to /podcasts is added to the counter card so the counter stays
  reachable as a health check. When the counter is removed later, this
  link is replaced by the podcast list itself.

## Acceptance criteria

- `npm run lint` exits 0.
- `npm run build` exits 0 with `output: 'export'` and no dynamic routes
  reported by Next.
- Logged in with an ADMIN account on the deployed site, the user can
  subscribe to a real feed by pasting its URL, see the podcast in the
  list, click it, and see its episodes.
- A hard reload on `/podcasts/view?id=<id>` returns the app, not a GitHub
  Pages 404 page.
- A non-subscribed user cannot reach the detail route for a podcast they
  do not follow. Backend returns 403; the frontend surfaces it as an
  inline error, not a blank page.
- The count of static routes in `out/` includes `/podcasts.html` and
  `/podcasts/view.html`.

## Out of scope

- Playback.
- RSS discovery (searching by name).
- OPML import/export.
- Any change to the counter feature.

## Notes

- **Static export and the detail route.** Next.js `output: 'export'`
  generates one HTML file per route. A dynamic segment (`/podcasts/[id]`)
  could only emit a single placeholder, because the real ids are assigned
  by the database on first subscription and are not known at build time;
  GitHub Pages, which serves files and has no rewrite rules, would then
  have nothing to serve for a deep link such as `/podcasts/42`. The detail
  route is therefore one static file — `/podcasts/view.html` — that reads
  the id from the query string (`/podcasts/view?id=42`). No SPA fallback is
  needed. See `DECISIONS.md` entries 18 and 19.
- **Data shapes.** The four DTO types in `frontend/lib/api/podcast.ts`
  mirror `PodcastSummaryDto`, `PodcastDto`, `EpisodeDto` and
  `SubscribeResult` from `docs/api/podcasts.md`. Update both files
  together when either changes; this is ARCHITECTURE §5 rule 8.
- **Design tokens.** Every new component uses `BaseButton`, `BaseCard`,
  `BaseField`, `BaseInput` and the semantic tokens. No raw `<button>`,
  `<input>` or `<select>` outside `frontend/components/base/`; the lint
  rule added in Phase 4 enforces this.
- **Theme.** Dark mode is live; new pages get it for free by using
  tokens, no per-component work.