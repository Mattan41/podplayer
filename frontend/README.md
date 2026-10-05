# Podplayer — Frontend

Next.js client for Podplayer. The site is a static export (`output: "export"`)
deployed to GitHub Pages at `https://podplayer.kruskopf.org`.

See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the stack, the design system
and the engineering principles, and [`../docs/ROADMAP.md`](../docs/ROADMAP.md)
for what is being built.

## Requirements

- Node.js 24 (the version used by the deploy workflow).

## Getting started

Copy the example environment file and fill in the values:

```bash
cp .env.example .env.local
```

Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Produce the static export in `out/`. |
| `npm run lint` | Run ESLint. Enforced in CI; see `docs/DECISIONS.md` entry 12. |
| `npm test` | Run the Vitest unit tests. |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Spring Boot backend. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public). |

Every `NEXT_PUBLIC_*` value is inlined into the static build and is visible to
every browser. They are configuration, not secrets. Real values are never
committed; see `infra/secrets.md`.

## Project layout

- `app/` — App Router pages, layouts and the theme bootstrap script.
- `app/globals.css` — the canonical theme token layer.
- `components/base/` — shared UI primitives; see
  [`components/base/README.md`](components/base/README.md).
- `components/player/` — the playback surface (mini and full player, scrubber,
  audio element).
- `lib/` — auth, API, theme and player providers.

`app/player-aware-main.tsx` is the shared wrapper that reserves room for the
fixed player bar under every route's content.

## Deployment

A push to `main` that touches `frontend/**` triggers
`.github/workflows/deploy-frontend.yml`, which lints, builds the static export
and publishes `frontend/out` to GitHub Pages.
