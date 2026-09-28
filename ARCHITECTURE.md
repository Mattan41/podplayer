# Architecture & Design System — Podplayer

## 1. Overview & Goals

A web-based podcast player focused on a disciplined, clean user experience with support for personal subscriptions, playback history, and cross-device playback progress synchronization.

---

## 2. Tech Stack & Infrastructure

### Frontend
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + Radix UI Primitives (headless)
- **Hosting:** GitHub Pages (Static Site Generation / SSG via `output: 'export'`)
- **Domain:** `podplayer.kruskopf.org` (Cloudflare CNAME pointing to GitHub Pages, DNS-only / gray cloud)

### Backend
- **Framework:** Java 25, Spring Boot 4.x (Web MVC, Data JPA, PostgreSQL Driver)
- **Deployment:** Containerized (`Dockerfile`) hosted on Google Cloud Run
- **Domain:** `podplayer-api.kruskopf.org` (Cloudflare CNAME pointing to `ghs.googlehosted.com`, DNS-only / gray cloud)
- **CORS:** Allowed origins configured via the `CORS_ALLOWED_ORIGINS` environment variable. Never hardcoded in source.

### Database & Auth
- **Provider:** Supabase (Managed PostgreSQL)
- **Auth:** Google OAuth via Supabase Auth; backend verifies JWT against an allowlist of permitted emails
- **Data Access:** Spring Boot connects via the **Transaction Pooler** endpoint (port `6543`, IPv4) with `?sslmode=require&prepareThreshold=0`. Transaction Pooler is preferred over Session Pooler because Session Pooler has a hard 15-client limit that Cloud Run autoscaling can exceed. Hikari pool size is capped at 3 connections per instance (5 instances × 3 = 15, safely within the pooler's limits).

### Infrastructure Reference
Detailed configuration for Cloud Run, Cloudflare DNS, and secret locations lives in `infra/`. See `infra/README.md` for the index.

---

## 3. Repository Structure

```text
podplayer/
├── frontend/             # Next.js client (SSG)
├── backend/              # Spring Boot REST API
├── shared/               # Shared API contracts, DTO schemas, OpenAPI specs
├── infra/                # Infrastructure reference docs (Cloud Run, DNS, secrets)
├── docs/                 # Extended design docs (style guide, etc.)
├── .github/workflows/    # CI/CD pipelines (frontend Pages deploy & backend Cloud Run build)
├── ARCHITECTURE.md       # This document
├── .clinerules           # Machine-readable rules for AI assistants
└── README.md             # Project quickstart
```

---

## 4. UI Style Guide & Design System

### 4.1 Concept

The default visual design is grounded in the **Zorn Palette**—a historical, restricted four-pigment palette used by Anders Zorn. Translated to UI, this yields a disciplined, stark, graphic feel rather than a generic app aesthetic: minimal colors, hard boundaries, and solid lines instead of drop shadows.

The visual system is **theme-based**: Zorn is the default theme, but the architecture supports additional themes (e.g. a monochrome variant, a child-friendly variant) that can be swapped without touching component code. See §4.6.

The shape language strictly separates two registers:

1. **Sharp (Default):** `border-radius: 0` on virtually everything (buttons, panels, cards, inputs, dialogs).
2. **Round (Exception, Sparse):** Perfectly circular elements (`border-radius: 9999px` / `50%`) used selectively for deliberate contrast (e.g., play button, user avatar, scrubber handle). **Never use intermediate rounding** (no `4px`, `8px`, `12px`). It is either 0 or a full circle.

### 4.2 Zorn Palette

#### Light Mode

| Name | Role | Hex | Usage |
| --- | --- | --- | --- |
| **Flake White** (*Blyvitt*) | Background / Surface | `#F1EAD9` | Canvas background, card surfaces |
| **Ivory Black** (*Elfenbensvart*) | Text / Lines | `#211D1A` | Body text, borders, iconography |
| **Yellow Ochre** (*Gulockra*) | Primary Accent | `#C69328` | Active states, highlights, progress fill |
| **Vermilion** (*Cinnober*) | CTA / Warning Accent | `#C1440E` | Play button, primary CTAs, errors, live badges |

**Rules:**

* Flake White and Ivory Black are the core workhorses. Yellow Ochre and Vermilion are strictly accents—never large surface fills.
* **Strict 4-color limit:** Do not introduce a 5th semantic color. Express state differences (e.g., success, warnings) using borders, dashed lines, opacity, or icons.
* **Contrast:** Ivory Black on Flake White meets AAA contrast. Accents must never be used as long body text on Flake White.

#### Dark Mode (Palette Rotation)

Dark mode is a true rotational inversion, not an arbitrary grayscale dim:

| Role | Light Mode | Dark Mode | Notes |
| --- | --- | --- | --- |
| **Background** | `#F1EAD9` | `#1A1714` | Cool, slightly bluish-tinted dark |
| **Text / Lines** | `#211D1A` | `#F1EAD9` | Inverted surface tone |
| **Primary Accent** | `#C69328` | `#D9A83E` | Brightened for dark-canvas contrast |
| **CTA Accent** | `#C1440E` | `#E0602A` | Brightened for dark-canvas contrast |

### 4.3 Typography

* **Families:** Max 2 font families—one distinct display typeface for branding/headings and one neutral sans-serif for UI/body text. Avoid the system font default; make the choice deliberate.
* **Formatting:** Avoid ALL CAPS for labels. Avoid mixed italic/bold inline highlighting in titles.
* **Line Length:** Max 80 characters for body text and episode descriptions.
* **Numerics:** Use tabular figures (`font-variant-numeric: tabular-nums`) so timestamps and scrubber counters do not cause layout shifts.

### 4.4 Form, Borders & Depth

* **Zero Box Shadows:** No `box-shadow` or subtle blur for element elevation. No gradient overlays.
* **Structural Lines:** Hierarchy is established through `1px solid` borders (Ivory Black in light mode, Flake White in dark mode).
* **Stronger Separation:** Use a `2px solid` line or a double line—not opacity changes or shadows.
* **Focus Indicators:** Keyboard focus must be a crisp, solid `2px` outline in Vermilion or Yellow Ochre—never a soft glow.

### 4.5 Component Architecture & Tokens

* **Primitives:** Use unstyled, headless primitives (**Radix UI**) for complex interactions (Slider, Dialog, Tabs, Dropdowns). Pick one library and do not mix.
* **Tokens (Tailwind 4 + CSS Variables):** Components must consume semantic CSS variables/tokens (`bg-bg`, `text-fg`, `border-fg`, `bg-accent`, `bg-cta`) rather than hardcoded hex values or palette-specific names.
* **Base components:** Shared primitives live in `frontend/components/base/`, and that folder is the only place where raw `button`, `input` and `select` elements are allowed. Their API and the conventions that apply to them are specified in [`frontend/components/base/README.md`](frontend/components/base/README.md) rather than duplicated here.

The token layer in `frontend/app/globals.css` looks like this:

```css
@import "tailwindcss";

:root {
  /* Default theme: Zorn (light) */
  --theme-bg: #f1ead9;
  --theme-fg: #211d1a;
  --theme-accent: #c69328;
  --theme-cta: #c1440e;
}

[data-theme="zorn"] {
  --theme-bg: #f1ead9;
  --theme-fg: #211d1a;
  --theme-accent: #c69328;
  --theme-cta: #c1440e;
}

[data-theme="zorn"][data-mode="dark"] {
  --theme-bg: #1a1714;
  --theme-fg: #f1ead9;
  --theme-accent: #d9a83e;
  --theme-cta: #e0602a;
}

@theme inline {
  --color-bg: var(--theme-bg);
  --color-fg: var(--theme-fg);
  --color-accent: var(--theme-accent);
  --color-cta: var(--theme-cta);
  --radius-base: 0px;
}

body {
  background-color: var(--theme-bg);
  color: var(--theme-fg);
}
```

### 4.6 Theme Switching

Themes are applied via `data-*` attributes on `<html>`:

```html
<html data-theme="zorn">                    <!-- Zorn, light -->
<html data-theme="zorn" data-mode="dark">   <!-- Zorn, dark -->
```

**Rules:**

1. **Every theme must define both a light and a dark variant.** A theme without a dark variant is incomplete; if a theme genuinely cannot support dark mode, it must state so explicitly and the ThemeProvider must fall back to another theme's dark mode.
2. **Never use Tailwind's `dark:` variant in components.** Dark mode is a property of the *theme*, not of the component. A component that says `bg-bg` automatically gets the correct background in every theme and mode.
3. **Never reference palette names (`zorn-*`) directly in components.** Palette names only exist inside `globals.css`; components see only semantic tokens.
4. **FOUC prevention:** A small inline script in `app/layout.tsx` (inside `<head>`) reads the persisted preference (e.g. `localStorage.theme` / `localStorage.mode`) and, if absent, falls back to `prefers-color-scheme`, then sets the `data-*` attributes on `<html>` before React hydrates.
5. **Switching at runtime:** Changing the theme is a matter of updating the `data-*` attributes on the `<html>` element. No component re-render is required; CSS variables cascade automatically.

The runtime implementation lives in `frontend/lib/theme-context.tsx`: a `ThemeProvider` that exposes `useTheme()`, hardcodes the `zorn` theme, and switches only the mode. Palette switching between themes is deliberately not built until a second theme exists. See `docs/DECISIONS.md` entry 13.

**Adding a new theme** (e.g. `mono`, `kid`) requires only:

```css
[data-theme="mono"] {
  --theme-bg: ...;
  --theme-fg: ...;
  --theme-accent: ...;
  --theme-cta: ...;
}

[data-theme="mono"][data-mode="dark"] {
  --theme-bg: ...;
  --theme-fg: ...;
  --theme-accent: ...;
  --theme-cta: ...;
}
```

No component code changes.

---

## 5. Engineering Principles for AI Assistants (Cline & Aider)

1. **Strict Token Usage:** Always use semantic theme classes (`bg-bg`, `text-fg`, `border-fg`, `bg-cta`). Never inline hex codes, palette names (`zorn-*`), or Tailwind's `dark:` variant in TSX components.
2. **Static Export Constraint:** The Next.js frontend deploys to GitHub Pages (`output: 'export'`). Do not implement Next.js Node-based API routes or server-side runtime headers. All dynamic endpoints live in Spring Boot.
3. **Shape Rule Enforcement:** Use `rounded-base` for rectangular surfaces and controls. It resolves through the theme radius (`--theme-radius`), so shape is a skin property rather than a component concern; Zorn sets it to `0`. Only designated focal elements (play trigger, avatar, scrubber thumb) may use `rounded-full`. Never intermediate radii such as `rounded-sm` or `rounded-md`.
4. **Base Components:** Use the `Base*` components from `frontend/components/base/` instead of raw `button`, `input` and `select` elements. Raw elements may only appear inside that folder. Enforced by `react/forbid-elements` at level `error` in `frontend/eslint.config.mjs`, which exempts `components/base/**`.
5. **Environment Isolation:** Never commit secrets. Backend configuration consumes environment variables for Supabase credentials. Env files live per-app: `backend/.env` (Spring), `frontend/.env.local` (Next). Root `.env` is reserved for tooling run from the repo root.
6. **No Datasource Defaults:** `backend/src/main/resources/application.yaml` must not contain default values for `SPRING_DATASOURCE_*`; missing env vars should fail fast on startup.
7. **No Hardcoded Domains in Source:** CORS origins, backend URLs, and similar environment-specific values must be read from environment variables. Default values in `application.yaml` are permitted only for local development (`http://localhost:3000`).
8. **Contract First:** When creating or modifying backend DTOs or endpoints, update the client-side fetchers and TypeScript interfaces to maintain end-to-end synchronization.
9. **Source of Truth for Versions:** Trust `backend/pom.xml` and `frontend/package.json` over this document when they disagree. Update this document rather than the code when a discrepancy is found.
10. **Enforced Token Patterns:** `no-restricted-syntax` at level `error` in `frontend/eslint.config.mjs` rejects three class patterns in `className` strings: an intermediate radius (`rounded-*` other than `rounded-base` / `rounded-full`, see §5.3 and `docs/DECISIONS.md` entry 6), a foreground opacity utility (`text-fg/…`, `bg-fg/…`, which is `text-muted` per entry 7), and `outline-accent` (which is `outline-cta` per entry 5). Each rule message names the replacement and the entry that explains it.

---

## 6. Implementation Roadmap

* [x] **Step 1: Monorepo & Project Scaffolding**
  * `frontend/` initialized (Next.js App Router, TypeScript, Tailwind 4)
  * `backend/` initialized (Spring Boot 4.x, Java 25, Web MVC, Data JPA, Postgres)
  * Tailwind 4 token layer configured in `frontend/app/globals.css`

* [x] **Step 2: Deployment & CI/CD**
  * Frontend deployed to GitHub Pages (`podplayer.kruskopf.org`), CI/CD via GitHub Actions
  * Backend deployed to Cloud Run (`podplayer-api.kruskopf.org`), CI/CD via GitHub Actions
  * Cloudflare DNS records set to DNS-only (gray cloud) for both subdomains
  * SSL managed by GitHub Pages and Cloud Run (Let's Encrypt, auto-renewed)
  * Workload Identity Federation configured between GitHub Actions and GCP (no long-lived keys)
  * Hikari pool capped at 3 connections per instance; Transaction Pooler (port 6543) used

* [x] **Step 3: Auth & Access Control**
  * Google OAuth login (frontend)
  * Backend JWT verification against an email allowlist
  * Protected endpoints reject unauthenticated requests

* [ ] **Step 4: Core Feature Implementation**
  * RSS feed ingestion & podcast episode parsing
  * Audio playback engine, media session integration, and mini/full player views
  * Playback progress tracking and cross-device state synchronization via Spring Boot

* [ ] **Step 5: Long-term Maintenance**
  * Migrate `SPRING_DATASOURCE_PASSWORD` (and eventually all datasource values) to GCP Secret Manager, referenced via `--set-secrets` in the deploy workflow
  * Migrate to `originPatterns` in CORS config once preview deploys (Cloudflare Pages / Vercel / Netlify) are added