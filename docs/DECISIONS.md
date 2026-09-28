# Decisions — Podplayer

Architectural decisions and known limitations that are worth remembering, but that
belong neither in `ARCHITECTURE.md` (which describes the system as it is) nor in a
component-level `README.md` (which describes a single API).

Entries are append-only. When a decision is reversed, add a new entry that
supersedes the old one rather than rewriting history, so the reasoning stays
auditable.

---

## 1. Defer Radix UI primitives

**Context.** `ARCHITECTURE.md` §4.5 and `docs/STYLEGUIDE.md` §7 name Radix UI as
the headless primitive library for complex interactions (Slider, Dialog, Tabs).
The UI built so far is an allowlist table and a counter button. Neither needs a
primitive, and neither does the first round of Base components.

**Decision.** Do not install `@radix-ui/*` yet. Build the first Base components
from native elements only, and install Radix together with the first component
that genuinely requires it (the player scrubber, or the first dialog).

**Consequence.** The initial Base component set carries no third-party dependency
and no version to keep current. Radix has to be installed (`npm install`) before
`BaseDialog` or `BaseSlider` can be built, and `docs/STYLEGUIDE.md` §7 ("pick one
library, do not mix") starts applying from the first Radix component onward.

## 2. Native `<select>` for `BaseSelect`

**Context.** The admin form needs a two-option role picker (USER / ADMIN). A Radix
Select would add a dependency to style a control this small.

**Decision.** `BaseSelect` wraps a native `<select>`, styled through the same
semantic tokens as `BaseInput`.

**Consequence.** Zero dependencies, full keyboard and screen-reader behavior for
free, and the OS-native picker on mobile, which matters because the admin view is
being repaired for mobile in the same change. The cost is that the option list is
rendered by the browser and cannot be styled, and that custom option rendering is
unavailable. Revisit if a richer picker appears, for example a searchable podcast
category field.

## 3. `danger` variant for destructive actions

**Context.** `Remove` in the admin view deletes an allowlist entry. `docs/STYLEGUIDE.md`
§2 already assigns Vermilion the "warning/CTA" role and forbids introducing a fifth
color, so the destructive meaning does not need a new hue. A filled Vermilion
button on every card would additionally contradict §2, which says accents are used
sparingly and never as large surface fills.

**Decision.** Add a third `BaseButton` variant, `danger`, defined as an outline in
the existing CTA token (`border-cta text-cta`, inverting to a filled CTA on hover).
No new color is introduced. `Remove` uses `variant="danger" size="sm"`.

**Consequence — measured contrast.** Ratios below were computed with the WCAG 2.1
relative luminance formula against the token values in `frontend/app/globals.css`.
The implementation was sanity-checked against the reference pair black on white,
which returned the expected 21.00:1.

| Mode | Foreground on background | Ratio | AA (4.5:1) |
| --- | --- | --- | --- |
| Light | `fg` on `bg` (outline variant) | 13.95:1 | pass |
| Light | `cta` on `bg` (danger variant) | **4.27:1** | **fail** |
| Light | `bg` on `cta` (cta variant fill, danger hover) | **4.27:1** | **fail** |
| Dark | `fg` on `bg` (outline variant) | 14.88:1 | pass |
| Dark | `cta` on `bg` (danger variant) | 4.99:1 | pass |
| Dark | `bg` on `cta` (cta variant fill, danger hover) | 4.99:1 | pass |

**Known limitation.** In light mode both Vermilion treatments sit just below AA
(4.27:1 against the required 4.5:1) for normal-size text, which includes the
`text-xs` used by `size="sm"`. The palette is deliberately not being changed, so
this is recorded as an accepted gap rather than fixed. The `cta` variant is
pre-existing and affected identically, so this change does not introduce the
problem. If it is ever fixed, the cheapest options are a slightly darker Vermilion
for light mode, or restricting `danger` to `size="md"` and above. Both are palette
decisions, not a refactor.

**Related finding, pre-existing and out of scope.** The same measurement shows
Yellow Ochre `accent` on Flake White `bg` at **2.30:1** in light mode, below the
3:1 that WCAG 1.4.11 requires for non-text contrast. `focus-visible` outlines use
`outline-accent`, so light-mode focus indicators are weaker than that guideline
asks for. Dark mode is fine at 8.18:1. Not addressed here.

## 4. Removing an allowlist entry has no confirmation

**Context.** `Remove` deletes an entry immediately on click. The action is
irreversible, and there is no undo.

**Decision.** Ship the card-list refactor without a confirmation step, and record
the gap instead of expanding the scope of this change.

**Consequence.** A mis-tap on mobile, which is exactly the viewport this change
targets, deletes an allowlist entry with no recourse beyond adding it again by
hand. The fix is a confirmation dialog, which needs `BaseDialog`, and `BaseDialog`
is blocked by entry 1. Revisit together with `BaseDialog`.

## 5. Focus outline uses the CTA token instead of the accent token

**Context.** The shared focus classes on `BaseButton`, `BaseInput` and `BaseSelect`
used `outline-accent`. Measuring the contrast of the base components showed Yellow
Ochre on the light background at 2.30:1, below the 3:1 that WCAG 1.4.11 requires for
non-text contrast, so light-mode focus indicators were weaker than the guideline
asks for. Dark mode was unaffected at 8.18:1.

**Decision.** Change the focus outline to `outline-cta` (Vermilion) in the shared
focus classes. `docs/STYLEGUIDE.md` §6 allows either Vermilion or Yellow Ochre for a
focus indicator, so this stays inside the design system and no token value changes.

**Consequence — measured ratios.**

| Mode | Outline against background | Ratio | 1.4.11 (3:1) |
| --- | --- | --- | --- |
| Light | `accent` on `bg` (before) | 2.30:1 | fail |
| Light | `cta` on `bg` (after) | 4.27:1 | pass |
| Dark | `accent` on `bg` (before) | 8.18:1 | pass |
| Dark | `cta` on `bg` (after) | 4.99:1 | pass |

Light mode moves from failing to passing. Dark mode becomes weaker but still passes
at 4.99:1 against the required 3:1, so no mode is left below the threshold.

**Effect on the variants.** On the `cta` and `danger` variants the ring now shares
the CTA color with the button's own border or fill, so it reads as a ring rather
than as a color change. `outline-offset-2` leaves two pixels of page background
between the border and the ring, which keeps them separated and gives the ring's
outer edge 4.27:1 against the background. Worth re-checking by eye whenever the
button variants change.

**Scope.** This covers the base components only. The three pages still carry their
own copies of the old `outline-accent` string until they are migrated to the base
components, so the last `outline-accent` occurrences disappear with those
migrations, not with this entry.

**Rejected alternative.** `outline-fg` (Ivory Black) would measure 13.95:1 in light
mode and 14.88:1 in dark mode, and it would be unambiguous on every variant because
no variant uses `fg` as its border or fill. It was rejected because
`docs/STYLEGUIDE.md` §6 restricts focus indicators to Vermilion or Yellow Ochre.
Changing §6 is a design decision rather than a refactor, so it is left open.

**Correction (see entry 8).** The ring described above was not painted while this
entry was written: `focus:outline-none` overrode the outline style that `outline-2`
relies on, so the colour measured here had no visible effect. The measurements still
hold, and they became observable when the missing `focus-visible:outline-solid` was
added in entry 8.

## 6. Corner radius is a skin property, exposed as `--theme-radius`

**Context.** Components used the Tailwind literal `rounded-none`, which hardcodes a
zero radius. The stated goal is that a skin can be swapped without touching
component code (`ARCHITECTURE.md` §4.6), and corner radius is something a skin
would reasonably want to control. A `--radius-base` token already existed in
`@theme inline`, but it was pinned to the literal `0px`, so it could not be themed
either.

**Decision.** Move the value into the theme blocks as `--theme-radius` and map the
utility to it, mirroring how `--color-*` already map to `--theme-*`:

```css
@theme inline {
  --radius-base: var(--theme-radius);
}
```

Components use `rounded-base`. Fully circular focal elements keep `rounded-full`
explicitly, and intermediate radii stay banned, so the rule is binary: `rounded-base`
or `rounded-full`.

`--radius-base` is not readable as a CSS variable at runtime: `@theme inline`
inlines the value, so the emitted rule is `border-radius: var(--theme-radius)` and
no `--radius-base` custom property exists in the document. Theme code therefore sets
`--theme-radius`, and component code uses the `rounded-base` utility.

**Consequence.** A skin block can now set any radius with no component change, and
Zorn sets `0px` in both modes, so nothing looks different today. Radius is
deliberately not repeated in the dark block: it is a property of the skin, not of
the mode.

**Note.** `docs/STYLEGUIDE.md` §5 and §8, and `ARCHITECTURE.md` §4.1, still describe
`border-radius: 0` as a fixed property of the design language. Those statements now
describe Zorn's value rather than a system rule, and are worth rewording in a future
documentation pass.

## 7. Muted text is a token, not `text-fg/70`

**Context.** Secondary text was written as `text-fg/70` in 15 places. That follows the
theme indirectly, but it always derives from the foreground, so a skin cannot tint
secondary text independently, and its contrast is a side effect rather than a choice.

**Decision.** Add `--theme-muted`, mapped to `--color-muted`, and use `text-muted`.
The values are the composite of `fg` at 70% over `bg`, rounded to the nearest 8-bit
channel, so rendering stays as close to the previous output as 8-bit color allows.

**Consequence — measured ratios.**

| Mode | Token | Ratio on `bg` | AA (4.5:1) |
| --- | --- | --- | --- |
| Light | `--theme-muted: #5f5b53` | 5.63:1 | pass |
| Dark | `--theme-muted: #b1ab9e` | 7.81:1 | pass |

**Verification.** `text-fg/70` compiles to
`color-mix(in oklab, var(--theme-fg) 70%, transparent)`, which resolves to the
foreground color at 0.7 alpha, composited over the backdrop in sRGB. Compositing
`fg` at 70% over `bg` in a browser canvas produced `rgb(95, 90, 83)` in light mode
against the token's `rgb(95, 91, 83)`, and `rgb(176, 170, 158)` in dark mode against
`rgb(177, 171, 158)`.

The residual difference is therefore one step in one or two 8-bit channels, which is
below the threshold of perception and sits inside the rounding ambiguity of the 0.5
boundaries involved (light green and dark red both land exactly on a half step).
Exact-parity alternatives would be `#5f5a53` and `#b0aa9e`, but those encode one
browser's truncation rather than the nearest representable value, so the rounded
values were kept.

**Scope.** Only `BaseField` uses `text-muted` so far. The remaining 14 `text-fg/70`
occurrences are in the pages, and they disappear as the pages are migrated in
Phases 2 and 3.

## 8. `focus-visible:outline-solid` is required for the focus ring to paint

**Context.** Phase 1 defined the shared focus styling as `focus:outline-none
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta`.
Measuring the migrated counter page in Phase 2 showed a focused button reporting
`outline-style: none` in the browser, so no ring was painted at all and the colour
change that entry 5 introduced was not observable.

**Cause.** Tailwind v4 emits

```css
.focus\:outline-none:focus              { --tw-outline-style: none; outline-style: none }
.focus-visible\:outline-2:focus-visible { outline-style: var(--tw-outline-style); outline-width: 2px }
```

The width utility takes its style from `--tw-outline-style`, and the suppression
utility sets that custom property to `none`. On a focused control both `:focus` and
`:focus-visible` match, so the ring had a width, an offset and a colour but no style.

**Decision.** Add `focus-visible:outline-solid` to the two shared class strings:
`BASE_CLASS` in `BaseButton.tsx` and `CONTROL_CLASS` in `control.ts` (shared by
`BaseInput` and `BaseSelect`). It emits `outline-style: solid` directly, so no custom
property is involved. `focus:outline-none` is kept: it is what suppresses the
browser's default ring on a plain mouse click.

**Measured result** (headless Chrome, Zorn light, 375 px viewport):

| Case | outline-style | width | colour | offset | ring painted |
| --- | --- | --- | --- | --- | --- |
| Button, keyboard focus (before) | none | 2px | rgb(198, 147, 40) | 2px | **no** |
| Button, keyboard focus (after) | solid | 2px | rgb(193, 68, 14) | 2px | yes |
| Input, keyboard focus (after) | solid | 2px | rgb(193, 68, 14) | 2px | yes |
| Select, keyboard focus (after) | solid | 2px | rgb(193, 68, 14) | 2px | yes |
| Button, mouse click | none | 3px (unused) | – | – | **no** |

`rgb(193, 68, 14)` is the `cta` token, so the ring is now Vermilion, as entry 5
intended. The mouse-click row is a `BaseButton` with a no-op handler, chosen so that
the measurement is not perturbed by the button being disabled while it increments.

**Ordering dependency.** `focus:outline-none` and `focus-visible:outline-solid` set the
same property at the same specificity, so the ring depends on Tailwind emitting the
`focus-visible` bucket after the `focus` bucket. The built stylesheet was checked and
does, in this order:

```css
.focus-visible\:outline-cta:focus-visible      { outline-color: var(--theme-cta) }
.focus-visible\:outline-solid:focus-visible    { --tw-outline-style: solid; outline-style: solid }
```

A reordering would silently remove the ring again, so this is worth re-checking
whenever `globals.css` or the Tailwind version changes.

**Rejected alternative.** `focus:outline-hidden` is v4's `outline: 2px solid
transparent`. Unlike `outline-none` it leaves `--tw-outline-style` alone, so the width
utility keeps working, but the shorthand also resets `outline-color` at the same
specificity as `focus-visible:outline-cta` and therefore depends on source order for
the colour as well. `outline-solid` changes one property that `outline-cta` does not
touch.

**Scope.** Only the base components are fixed here. `frontend/app/admin/page.tsx` and
`frontend/app/header.tsx` still carry their own copies of the broken string; they
inherit the fix when they are migrated in Phase 3.
