Här är hela uppdaterade `ARCHITECTURE.md`. Ändringar markerade i slutet.

---

```markdown
# Architecture & Design System — Podplayer

## 1. Overview & Goals
A web-based podcast player focused on a disciplined, clean user experience with support for personal subscriptions, playback history, and cross-device playback progress synchronization.

---

## 2. Tech Stack & Infrastructure

### Frontend
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + Radix UI Primitives (headless)
- **Hosting:** GitHub Pages (Static Site Generation / SSG via `output: 'export'`)
- **Domain:** `podplayer.kruskopf.org` (Cloudflare CNAME pointing to GitHub Pages)

### Backend
- **Framework:** Java 25, Spring Boot 4.x (Web MVC, Data JPA, PostgreSQL Driver)
- **Deployment:** Containerized (`Dockerfile`) hosted on Google Cloud Run
- **Domain:** `podplayer-api.kruskopf.org` (or `api.podplayer.kruskopf.org`) configured as DNS-only / gray cloud in Cloudflare to bypass nested wildcard SSL constraints
- **CORS:** Allowed origins: `https://podplayer.kruskopf.org` and `http://localhost:3000` (development)

### Database & Auth
- **Provider:** Supabase (Managed PostgreSQL)
- **Auth:** Google OAuth via Supabase Auth; backend verifies JWT against an allowlist of permitted emails
- **Data Access:** Spring Boot connects to Supabase PostgreSQL via standard JDBC/JPA using the Session Pooler endpoint (IPv4) with `?sslmode=require&prepareThreshold=0`

---

## 3. Repository Structure

```text
podplayer/
├── frontend/             # Next.js client (SSG)
├── backend/              # Spring Boot REST API
├── shared/               # Shared API contracts, DTO schemas, OpenAPI specs
├── .github/workflows/    # CI/CD pipelines (frontend Pages deploy & backend Cloud Run build)
├── ARCHITECTURE.md       # This document
├── STYLEGUIDE.md         # Extended style guide (may be folded into §4 over time)
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
3. **Shape Rule Enforcement:** Enforce `rounded-none` by default. Only designated focal elements (play trigger, avatar, scrubber thumb) may use `rounded-full`. Never intermediate radii.
4. **Environment Isolation:** Never commit secrets. Backend configuration consumes environment variables for Supabase credentials. Env files live per-app: `backend/.env` (Spring), `frontend/.env.local` (Next). Root `.env` is reserved for tooling run from the repo root.
5. **No Datasource Defaults:** `backend/src/main/resources/application.yaml` must not contain default values for `SPRING_DATASOURCE_*`; missing env vars should fail fast on startup.
6. **Contract First:** When creating or modifying backend DTOs or endpoints, update the client-side fetchers and TypeScript interfaces to maintain end-to-end synchronization.
7. **Source of Truth for Versions:** Trust `backend/pom.xml` and `frontend/package.json` over this document when they disagree. Update this document rather than the code when a discrepancy is found.

---

## 6. Implementation Roadmap

* [x] **Step 1: Monorepo & Project Scaffolding**
  * `frontend/` initialized (Next.js App Router, TypeScript, Tailwind 4)
  * `backend/` initialized (Spring Boot 4.x, Java 25, Web MVC, Data JPA, Postgres)
  * Tailwind 4 token layer configured in `frontend/app/globals.css`

* [ ] **Step 2: Database, Walking Skeleton & Auth**
  * [x] Provision Supabase project and verify JDBC connectivity via Session Pooler
  * [x] Walking skeleton: `/api/counter` GET + `/increment` POST persisted to Supabase
  * [ ] Google OAuth login and backend JWT verification against an email allowlist

* [ ] **Step 3: CI/CD Workflows**
  * GitHub Action for frontend static build and GitHub Pages deployment (`paths: ['frontend/**']`)
  * Backend `Dockerfile` and automated build pipeline for Google Cloud Run (`paths: ['backend/**']`)
  * Cloudflare DNS records and SSL parameters verified (DNS-only / gray cloud for both subdomains)

* [ ] **Step 4: Core Feature Implementation**
  * RSS feed ingestion & podcast episode parsing
  * Audio playback engine, media session integration, and mini/full player views
  * Playback progress tracking and cross-device state synchronization via Spring Boot
```

---

## Vad som ändrades jämfört med din version

**§2 Backend & Database**
- Fixade `Spring Boot 4.x` → behöll, men ändrade `Web` → `Web MVC` för att matcha `spring-boot-starter-webmvc` i pom.xml.
- Lade till Session Pooler-detaljer (`sslmode=require&prepareThreshold=0`) — det är en icke-trivial detalj som annars glöms.
- Uppdaterade Auth från "Supabase Auth (Email/Password, Magic Link, OAuth)" till "Google OAuth via Supabase Auth; backend verifierar JWT mot allowlist" — matchar din faktiska plan.

**§3 Repository Structure**
- `podcast-player/` → `podplayer/` (matchar repo-namnet).
- `ARCHITECTURE.md` (fixade typot).
- Lade till `STYLEGUIDE.md` och `.clinerules` i trädet.

**§4.1 Concept**
- Lade till meningen om att Zorn är default men att systemet stödjer flera teman.

**§4.2**
- Rubriken ändrad från `Color Palette` → `Zorn Palette` (eftersom den nu är ett tema bland flera).

**§4.5 CSS-exempel**
- Bytte ut `--zorn-*`-blocket mot exakt det som finns i din faktiska `globals.css`. Nu är dokument och kod i synk.

**§4.6 Theme Switching** (helt nytt avsnitt)
- Dokumenterar `data-theme` + `data-mode`-strategin.
- Uttrycklig regel: **aldrig `dark:` i komponenter**.
- FOUC-strategi.
- Hur nya teman läggs till.

**§5 Engineering Principles**
- Regel 1: utökad med "no `dark:` variant, no `zorn-*` in components".
- Regel 4: uppdaterad med per-app env-fil-modellen.
- Regel 5: helt ny — "No Datasource Defaults".
- Regel 7: helt ny — "Trust pom.xml/package.json over this doc".

**§6 Roadmap**
- Steg 1 markerat `[x]`.
- Steg 2 utökat med walking skeleton (klart) och Auth (kvar).
- Steg 3–4 orörda, men konsekvent formatering.

---

Committa `ARCHITECTURE.md` + `globals.css` + `pom.xml` + `application.yaml` i en gemensam commit, t.ex.:

```
docs+refactor: theme-agnostic tokens, remove DB defaults, sync architecture doc
```

Då har du en ren checkpoint att gå vidare från — och nästa steg blir punkt 3 i roadmappen (CI/CD + Cloud Run), eller Auth om du vill ha den på plats först.