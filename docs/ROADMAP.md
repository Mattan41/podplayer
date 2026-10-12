# Roadmap — Podplayer

Roadmap at the phase level. Each phase has its own file in `docs/roadmap/`
with the detail: acceptance criteria, dependencies, what is out of scope.
This file is the index.

Phases are sequential. A phase is done when its acceptance criteria are
met and it is committed. Phases are not scheduled by date; they are
scheduled by dependency.

---

## Completed

### Step 1 — Monorepo and scaffolding
Frontend (Next.js, TypeScript, Tailwind 4), backend (Spring Boot 4, Java 25,
Data JPA, Postgres), token layer in `globals.css`. See `ARCHITECTURE.md` §6.

### Step 2 — Deployment and CI/CD
GitHub Pages for the frontend, Cloud Run for the backend, Cloudflare
DNS-only, Let's Encrypt SSL, Workload Identity Federation, Hikari capped
at 3 connections with the Transaction Pooler. See `infra/`.

### Step 3 — Auth and access control
Google OAuth via Supabase, JWT verification against a database-backed
allowlist, role-based access. See `DECISIONS.md` entries 1–14 for the base
component refactor and dark mode that followed.

---

## In progress: Step 4 — Core features

Step 4 is delivered as six phases. See `docs/roadmap/` for each.

| Phase | Name | Depends on |
| --- | --- | --- |
| A | [Domain model](roadmap/domain-model.md) — **done** | Step 3 |
| B | [Feed ingestion](roadmap/feed-ingestion.md) — **done** | Phase A |
| C | [Library UI](roadmap/library-ui.md) — **done** | Phase B |
| D | [Playback engine](roadmap/playback-engine.md) — **done** | Phase A (playback state schema), Phase C |
| E | [Playback state](roadmap/playback-state.md) — **done** | Phase D |
| F | [PWA and Media Session](roadmap/pwa-media-session.md) — **in progress** | Phase E |

### Phase A — Domain model

The `Podcast`, `Episode`, `Subscription` and `PlaybackState` entities,
their Flyway migration, and their repositories. No ingestion, no
frontend. Verified by `./mvnw test`.

### Phase B — Feed ingestion

Parse RSS and Atom feeds, create `Podcast` and `Episode` rows, wire
subscribe and refresh endpoints. Introduces one backend dependency; see
the phase file for the `DECISIONS.md` entry that must accompany it.
Done: Rome 2.1.0, `RssFeedParser`, `PodcastService`, `PodcastController`,
`RssFeedParserTest`, and the first `docs/api/` file.

### Phase C — Library UI

Frontend: subscription list, episode list, add-podcast form. `npm run lint`
and `npm run build` both exit 0, and the export contains `/podcasts.html` and
`/podcasts/view.html` — the podcast detail is a single static route that reads
the id from `?id=`, so no dynamic segment is emitted. See
`DECISIONS.md` entries 18 and 19 for why the dynamic route and its SPA
fallback were replaced. C.5 followed in the same step: the landing page
(`/`) is now the subscription list, and the frontend counter page is
retired. See `DECISIONS.md` entry 21. C.5's second half added the
`PodcastSource` interface and a localStorage read cache behind it, so a
page the user has visited before paints from cache before the network
answers; see `DECISIONS.md` entry 22. Phase D (playback engine) is next.

### Phase D — Playback engine
The `PlayerProvider`, the `<audio>` element, the mini and full player
views. Introduces `@radix-ui/react-slider` and `@radix-ui/react-dialog`;
see `DECISIONS.md` entry 1 for why Radix arrives here and not earlier.

Done. Frontend code complete: `player-context.tsx`, `AudioElement`,
`MiniPlayer`, `FullPlayer`, `Scrubber`, `BaseSlider` and `BaseDialog`, with a
play control on each episode row. `npm run lint` and `npm run build` both exit
0; the singleton, grep and browser-behaviour criteria are measured. See
`DECISIONS.md` entries 26–31.

### Phase E — Playback state
Save and restore playback position. Cross-device resume.

Done. The backend `PlaybackStateController` and its two DTOs
(`docs/api/playback.md`); `frontend/lib/api/playback.ts`; the `PlaybackSource`
seam; and the writes and the resume rule in `PlayerProvider`. See
`DECISIONS.md` entries 35–39.

### Phase F — PWA and Media Session
Installable app, lock-screen controls, offline metadata cache. Does not
include offline audio; that is Phase G.

In progress. The web app manifest (`app/manifest.ts`), the hand-written
app-shell service worker (`public/sw.js`) with its production-only registration,
and the Media Session binding (`lib/media-session.ts`) are in place. See
`DECISIONS.md` entries 42–45. The device criteria — install prompt, headphone
buttons, lock-screen artwork, offline cold open — are verified on a real device,
not in CI.

---

## Planned after Step 4

### Phase G — Offline audio
Download individual episodes for offline playback. Requires the Storage
API, an explicit download UI, and a handling of iOS's stricter cache
quota. Not scheduled. See `BACKLOG.md` under "Playback".

### Step 5 — Long-term maintenance
- Migrate `SPRING_DATASOURCE_PASSWORD` to GCP Secret Manager, referenced
  via `--set-secrets` in the deploy workflow.
- Migrate CORS to `originPatterns` once preview deploys exist.

---

## Hygiene

Opportunistic work that is done when a file is touched for another
reason, not as a dedicated phase.

- **`@PreAuthorize` on controller classes.** New controllers declare
  authorization at class level. `AdminUserController` gets it the next
  time it is modified. `SecurityConfig` keeps only the coarse rules
  (`/api/auth/**` permitAll, everything else authenticated).
- **`docs/api/`** exists as of Phase B, starting with `podcasts.md`. Add
  one file per feature as endpoints arrive, matching the level of detail
  in `DECISIONS.md`.


  - **Documentation audit** Run the same audit that we have done a few tims now: stale facts, contradictions, dead links, orphan sections, missing references.

  - Sonarcube reports
  - ask Claude for honest opinion on the documentation