# Style Guide — Podplayer

Design-token-based style guide. Intended as context for Cline and other AI assistants before implementation begins.

**Stack:** Next.js (frontend) + Spring Boot (backend), Tailwind 4, headless components.

> The canonical token layer and CSS example live in `ARCHITECTURE.md` §4.5. This document explains the *reasoning* behind the design choices; it does not duplicate the CSS.

---

## 1. Concept

The Zorn palette is a historical, highly restricted painter's palette (Anders Zorn) with only four pigments. Translated to UI, it produces a design that feels disciplined and graphic rather than "app-y": few colors, hard edges, lines instead of shadows. The goal is for the palette and shape language to feel like a *choice*, not like Tailwind's default look.

The shape language holds two registers that must be kept distinct:

- **Sharp** (default): `border-radius: 0` on virtually everything — buttons, panels, cards, inputs.
- **Round** (exception, sparse): individual fully circular elements (e.g. play button, an avatar, a progress dot) to create contrast against everything sharp. Never "slightly rounded" (4px, 8px, etc.) — either 0 or a perfect circle, nothing in between.

---

## 2. Color Palette (light mode)

| Name | Role | Hex | Usage |
|---|---|---|---|
| Flake White | Background / surface | `#F1EAD9` | Page background, card surfaces |
| Ivory Black | Text / lines | `#211D1A` | Body text, borders, icons |
| Yellow Ochre | Accent (primary) | `#C69328` | Active states, highlights, progress fill |
| Vermilion | Accent (warning/CTA) | `#C1440E` | Play/CTA buttons, error messages, "live" indicator |

Rules:

- Flake White and Ivory Black are the workhorses (background/text). Yellow Ochre and Vermilion are used sparingly, as accents — never as large surface fills.
- No fifth color is introduced. If a new semantic color is "needed" (e.g. success/error), solve it with opacity or pattern (e.g. dashed border) on the four existing colors, not with a new hex.
- Contrast: Ivory Black on Flake White gives very high contrast (AAA). Vermilion/Yellow Ochre are never used as text color on Flake White for longer text — only for short labels, icons, and filled buttons with white/black text on top.

---

## 3. Dark Mode (rotated, not "dimmed")

Dark mode is a true palette rotation, not just a darker gray:

| Role | Light mode | Dark mode |
|---|---|---|
| Background | Flake White `#F1EAD9` | Ivory Black `#1A1714` |
| Text / lines | Ivory Black `#211D1A` | Flake White `#F1EAD9` |
| Accent primary | Yellow Ochre `#C69328` | Yellow Ochre `#D9A83E` (lighter, for contrast against dark background) |
| Accent CTA | Vermilion `#C1440E` | Vermilion `#E0602A` (lighter) |

The dark-mode Ivory Black should feel *cool* (slightly bluish/cold black), not neutral gray — that is what makes it feel like the same palette rotated, not a different design.

---

## 4. Typography

- One display typeface for headings/branding, one for body text — max two families, clearly different in character (e.g. a tight serif for headings + a neutral sans for UI/body). Avoid the system font's default feel; make the choice deliberately.
- No ALL CAPS on labels. No isolated italic/bold word highlighting in headings.
- Line length < 80 characters in body text (e.g. episode descriptions).
- Numbers (timestamps, playback time) use tabular figures if the typeface supports it, so progress digits don't "jump" in width.

---

## 5. Shape & Edge

- `border-radius: 0` as global default on Button, Card, Input, Modal, Panel.
- Exception — fully circular elements (`border-radius: 9999px` / `50%`), used deliberately on at most 1–2 elements per view:
  - Play/pause button in mini-player and full player.
  - Avatar / podcast cover thumbnail in lists (may also be sharp — pick one and stay consistent).
  - Progress handle (draggable dot) on the scrubber line.
- Nothing in between (no 4px/8px/12px rounding anywhere).

---

## 6. Depth & Separation — lines, not shadows

- No `box-shadow` for separation or "lift". No gradients.
- Depth/hierarchy is created with:
  - `border: 1px solid` (Ivory Black/Flake White depending on mode) between sections, around cards, under list rows.
  - When stronger separation is needed: thicker border (2px) or a double line — not more opacity/blur.
- Focus indicator (keyboard focus) = a thick solid outline in Vermilion or Yellow Ochre, never a soft glow.

---

## 7. Component Architecture

- Base UI primitives on headless libraries with no built-in styling — Radix UI *or* Headless UI (pick one, don't mix). Radix UI Primitives is recommended first given broader component coverage (Slider/Dialog/Tabs are needed for a podcast player).
- All visual styling (color, edge, spacing, typeface) is defined **centrally** as design tokens — never hardcoded in individual components — so a future second "skin"/color profile can be swapped in without touching component logic.
- Tailwind 4: define the palette as CSS variables in `@theme`, not as ad-hoc classes in JSX.

See `ARCHITECTURE.md` §4.5 for the canonical token layer, and §4.6 for the theme-switching strategy.

---

## 8. Summary Principles (Initially)

1. Four colors, no more. Two are surface/text, two are sparing accents.
2. Dark mode = rotation of the palette, not a grayscale dimmer.
3. `border-radius: 0` everywhere, except for occasional fully circular elements for contrast.
4. Separation/depth = borders, never shadows or gradients.
5. Headless primitives (Radix UI) + Tailwind 4, all styling via central tokens/CSS variables — no hardcoded color in component code.
6. No hardcoded domains in components or backend source — everything environment-specific lives in environment variables.

---

## 9. AI Assistant Rules

Beyond the design principles above, AI assistants must also follow:

- **No `dark:` variant in components.** Dark mode is expressed via `[data-mode="dark"]` on `<html>`, resolved through tokens. See `ARCHITECTURE.md` §4.6.
- **No `zorn-*` classes in components.** Palette names exist only in `globals.css`.
- **Never inline hex values in TSX.**
- **When in doubt, read `ARCHITECTURE.md` §5 (Engineering Principles) before writing code.**