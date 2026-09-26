# Architecture & Design System — Podplayer

## 1. Overview & Goals
A web-based podcast player focused on a disciplined, clean user experience with support for personal subscriptions, playback history, and cross-device playback progress synchronization.

---

## 2. Tech Stack & Infrastructure

### Frontend
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + Radix UI Primitives (headless)
- **Hosting:** GitHub Pages (Static Site Generation / SSG via `output: 'export'`)
- **Domain:** `podcastplayer.kruskopf.org` (Cloudflare CNAME pointing to GitHub Pages)

### Backend
- **Framework:** Java 21+, Spring Boot 3.x (Web, Data JPA, PostgreSQL Driver)
- **Deployment:** Containerized (`Dockerfile`) hosted on Google Cloud Run
- **Domain:** `podcastplayer-api.kruskopf.org` (or `api.podcastplayer.kruskopf.org` configured as DNS-only / gray cloud in Cloudflare to bypass nested wildcard SSL constraints)
- **CORS:** Allowed origins: `https://podcastplayer.kruskopf.org` and `http://localhost:3000` (development)

### Database & Auth
- **Provider:** Supabase (Managed PostgreSQL)
- **Auth:** Supabase Auth (Email/Password, Magic Link, OAuth)
- **Data Access:** Spring Boot connects to Supabase PostgreSQL via standard JDBC/JPA with connection pooling

---

## 3. Repository Structure

```text
podcast-player/
├── frontend/             # Next.js client (SSG)
├── backend/              # Spring Boot REST API
├── shared/               # Shared API contracts, DTO schemas, OpenAPI specs
├── .github/workflows/    # CI/CD pipelines (frontend Pages deploy & backend Cloud Run build)
├── ARCHITECTURE.md       # System architecture and style guide specification
└── README.md             # Project quickstart

```

---

## 4. UI Style Guide & Design System (Zorn Palette)

### 4.1 Concept

The visual design is grounded in the **Zorn Palette**—a historical, restricted four-pigment palette used by Anders Zorn. Translated to UI, this yields a disciplined, stark, graphic feel rather than a generic app aesthetic: minimal colors, hard boundaries, and solid lines instead of drop shadows.

The shape language strictly separates two registers:

1. **Sharp (Default):** `border-radius: 0` on virtually everything (buttons, panels, cards, inputs, dialogs).
2. **Round (Exception, Sparse):** Perfectly circular elements (`border-radius: 9999px` / `50%`) used selectively for deliberate contrast (e.g., play button, user avatar, scrubber handle). **Never use intermediate rounding** (no `4px`, `8px`, `12px`). It is either 0 or a full circle.

### 4.2 Color Palette

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

* **Families:** Max 2 font families—one distinct display typeface for branding/headings and one neutral sans-serif for UI/body text.
* **Formatting:** Avoid ALL CAPS for labels. Avoid mixed italic/bold inline highlighting in titles.
* **Line Length:** Max 80 characters for body text and episode descriptions.
* **Numerics:** Use tabular figures (`font-variant-numeric: tabular-nums`) so timestamps and scrubber counters do not cause layout shifts.

### 4.4 Form, Borders & Depth

* **Zero Box Shadows:** No `box-shadow` or subtle blur for element elevation. No gradient overlays.
* **Structural Lines:** Hierarchy is established through `1px solid` borders (Ivory Black in light mode, Flake White in dark mode).
* **Stronger Separation:** Use a `2px solid` line or a double line—not opacity changes or shadows.
* **Focus Indicators:** Keyboard focus must be a crisp, solid `2px` outline in Vermilion or Yellow Ochre—never a soft glow.

### 4.5 Component Architecture & Tokens

* **Primitives:** Use unstyled, headless primitives (**Radix UI**) for complex interactions (Slider, Dialog, Tabs, Dropdowns).
* **Tokens (Tailwind 4 + CSS Variables):** Components must consume semantic CSS variables/tokens (`bg-bg`, `text-fg`, `border-fg`, `bg-accent`, `bg-cta`) rather than hardcoded hex values or raw color names.

```css
/* app/globals.css */
@theme {
  --color-bg: var(--zorn-bg);
  --color-fg: var(--zorn-fg);
  --color-accent: var(--zorn-accent);
  --color-cta: var(--zorn-cta);
  --radius-base: 0px;
}

:root {
  --zorn-bg: #F1EAD9;      /* Flake White */
  --zorn-fg: #211D1A;      /* Ivory Black */
  --zorn-accent: #C69328;  /* Yellow Ochre */
  --zorn-cta: #C1440E;     /* Vermilion */
}

[data-theme="dark"] {
  --zorn-bg: #1A1714;
  --zorn-fg: #F1EAD9;
  --zorn-accent: #D9A83E;
  --zorn-cta: #E0602A;
}

```

---

## 5. Engineering Principles for AI Assistants (Cline & Aider)

1. **Strict Token Usage:** Always use semantic theme classes (`bg-bg`, `text-fg`, `border-fg`, `bg-cta`). Never inline hex codes in TSX components.
2. **Static Export Constraint:** The Next.js frontend deploys to GitHub Pages (`output: 'export'`). Do not implement Next.js Node-based API routes or server-side runtime headers. All dynamic endpoints live in Spring Boot.
3. **Shape Rule Enforcement:** Enforce `rounded-none` by default. Only designated focal elements (play trigger, avatar, scrubber thumb) may use `rounded-full`.
4. **Environment Isolation:** Never commit secrets. Backend configuration consumes environment variables mapping to Supabase credentials.
5. **Contract First:** When creating or modifying backend DTOs or endpoints, update the client-side fetchers and TypeScript interfaces to maintain end-to-end synchronization.

---

## 6. Implementation Roadmap

* [ ] **Step 1: Monorepo & Project Scaffolding**
* Initialize `frontend/` (`npx create-next-app@latest` with App Router, TypeScript, Tailwind)
* Initialize `backend/` (Spring Boot 3.x, Java 21, Web, Data JPA, Postgres)
* Configure Tailwind 4 CSS variables and Radix primitives in `frontend/`


* [ ] **Step 2: Database & Auth Setup**
* Provision Supabase project and schema
* Configure Spring Boot `application.yml` database connection with local environment variables


* [ ] **Step 3: CI/CD Workflows**
* Setup GitHub Action for frontend static build and GitHub Pages deployment (`paths: ['frontend/**']`)
* Setup backend `Dockerfile` and automated build pipeline for Google Cloud Run (`paths: ['backend/**']`)
* Verify Cloudflare DNS records and SSL parameters


* [ ] **Step 4: Core Feature Implementation**
* RSS feed ingestion & podcast episode parsing
* Audio playback engine, media session integration, and mini/full player views
* Playback progress tracking and cross-device state synchronization via Spring Boot
