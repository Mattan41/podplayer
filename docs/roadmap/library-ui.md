# Phase C — Library UI

Frontend: subscription list, episode list, add-podcast form. No playback.

## Deliverables

- `frontend/lib/api/podcast.ts` — types and apiFetch wrappers for the four
  endpoints in `docs/api/podcasts.md`. Both TypeScript types and the
  wrapper functions live here; split later if the file grows past ~200
  lines.
- `frontend/app/podcasts/page.tsx` — the subscription list and the
  add-podcast form.
- `frontend/app/podcasts/[id]/page.tsx` — the episode list for one podcast,
  with a refresh button.
- `frontend/app/header.tsx` — a link to /podcasts, visible only when the
  user is authenticated.
- `frontend/app/page.tsx` — the counter remains the landing page for now.
  A link to /podcasts is added to the counter card so the counter stays
  reachable as a health check. When the counter is removed later, this
  link is replaced by the podcast list itself.
- `frontend/public/404.html` — a fallback that redirects any unmatched
  path to the SPA and preserves the URL, so that a hard reload on
  `/podcasts/42` works. This was originally planned for the PWA phase; the
  dynamic route in this phase makes it necessary now.

## Acceptance criteria

- `npm run lint` exits 0.
- `npm run build` exits 0 with `output: 'export'` and no dynamic routes
  reported by Next.
- Logged in with an ADMIN account on the deployed site, the user can
  subscribe to a real feed by pasting its URL, see the podcast in the
  list, click it, and see its episodes.
- A hard reload on `/podcasts/<id>` returns the app, not a GitHub Pages
  404 page.
- A non-subscribed user cannot reach `/podcasts/<id>` for a podcast they
  do not follow. Backend returns 403; the frontend surfaces it as an
  inline error, not a blank page.
- The count of static routes in `out/` includes `/podcasts.html` and
  `/podcasts/[id].html` (or whatever name Next emits for the dynamic
  segment).

## Out of scope

- Playback.
- RSS discovery (searching by name).
- OPML import/export.
- Any change to the counter feature.

## Notes

- **Static export and dynamic routes.** Next.js `output: 'export'`
  generates one HTML per route segment. A dynamic segment produces a
  single `[id].html` file and relies on client-side routing to render the
  right content once the JS bundle loads. GitHub Pages serves that file
  only if the requested path resolves to it; without a fallback, a hard
  reload on `/podcasts/42` returns GitHub Pages' own 404. The
  `404.html` fallback in this phase fixes that, and is the same file
  Phase F would have needed later. Moving it forward changes nothing
  about how Phase F will work.
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