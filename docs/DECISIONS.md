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

**Correction (see entry 14).** The dark rows above were computed from the token
values, not rendered, because no runtime switch set `data-mode` until entry 13.
Entry 14 re-measures every pair in a rendered Chrome and confirms them to two
decimals. The light-mode Vermilion gap remains as recorded.

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

**Correction (see entry 14).** The dark ratios above (`cta` 4.99:1, `accent`
8.18:1) were computed from token values, not rendered, until entry 13 wired the
mode switch. Entry 14 re-measures them in a browser and confirms both.

**Correction.** Superseded: the pages were migrated in Phase 3; no `outline-accent` remains in `frontend/app/`.

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

**Correction (see entry 14).** The dark ratio above (`7.81:1`) was computed from
the token value, not rendered, until entry 13 wired the mode switch. Entry 14
re-measures it in a browser and confirms it.

**Correction.** Superseded: the pages were migrated in Phase 3; no `text-fg/70` remains in `frontend/app/`.

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

**Correction.** Superseded: the pages were migrated in Phase 3; no broken focus class string remains in `frontend/app/`.

## 9. The admin allowlist is two layouts over one list

**Context.** The admin allowlist was a single `<table>` that overflowed
horizontally on a 375 px viewport. Six columns of content, one of which is
an e-mail address, do not fit on a phone.

**Decision.** Render the same `users` array twice, once as a `<table>` at
`md` and above and once as a `<ul>` of cards below `md`. Toggle with
`hidden md:table` and `md:hidden`, both of which compile to `display`, so
the hidden layout is not rendered for assistive technology or the tab
order.

**Consequence — measured at both breakpoints.**

| Viewport | `table` display | `ul` display | scrollWidth / clientWidth |
| --- | --- | --- | --- |
| 375 px | `none` | `block` | 375 / 375 — no horizontal scroll |
| 768 px | `table` | `none` | 768 / 768 — no horizontal scroll |

A >40-character address (`very.long.allowlisted.address@example-subdomain.test`,
51 chars) wraps inside its card: `p.scrollWidth == p.clientWidth == 261`. The
table's email cell carries `break-all` for the same reason. The empty state
appears in both views: as a single `<li>` at 375 px and in a `colspan="6"`
cell at 768 px.

**Judgement calls recorded here rather than in a separate entry.**

1. `Remove` uses the `danger` variant introduced in entry 3, not the filled
   `cta` button it used before. Visible change, pre-approved by that entry.
2. `Save` and `Remove` gained 2 px of padding per side (`py-1` to `py-1.5`).
   The old page used `py-1`, which is not one of `BaseButton`'s two sizes.
   Adding a third size for two buttons was rejected; the size system stays
   at `sm` / `md`, and the previous page's padding was outside it.
3. The two page-level `<section className="rounded-none border border-fg
   bg-bg">` wrappers became `BaseCard`. `.clinerules` forbids `rounded-none`,
   so they were already a rule violation, and the change is what let the
   allowlist's own layout use `BaseCard` consistently.
4. Every `text-fg/70` in these two files became `text-muted`, completing the
   migration entry 7 promised.

The net result: `grep -rn '<button|<input|<select' frontend/app` finds
nothing, and `grep -rn 'rounded-none|text-fg/70|outline-accent|zorn-'
frontend/app` finds nothing. Both grep commands are the acceptance test
for this phase; if a later change reintroduces either pattern, the phase
has been reopened.

## 10. Native `datetime-local` consumes seven Tab presses in Chrome

**Context.** Verifying the focus ring in the admin form required tabbing
through the visible controls. Reaching the `Save` button took roughly
fourteen Tab presses, not the seven the number of controls suggested.

**Cause.** A native `<input type="datetime-local">` is a composite
control: date, hour, minute, and (depending on locale) day-period each
occupy their own internal field, and Chrome keeps Tab inside the control
until every field has been visited. This is defined by the browser and
the `:focus-visible` spec, not by the project's CSS or by `BaseInput`.

**Decision.** Accept the behaviour. Suppressing it would require styling
`:focus` instead of `:focus-visible`, which would make a mouse click on a
button paint a ring as well. Both halves of the trade are worse than the
original.

**Consequence.** A keyboard-only user takes fourteen Tab presses to reach
`Save` when the `datetime-local` field is empty. Recorded as a known
limitation. Revisit only if a user complains; the alternatives are three
separate fields or a custom date picker, both of which need a component
that does not exist yet.

**Related finding.** The same verification pass confirmed that Chrome
treats text-entry elements as always `:focus-visible`, so clicking the
email input paints a ring. Buttons behave as required: mouse click, no
ring. This is spec behaviour and is documented here rather than "fixed",
because fixing it would remove the ring from the keyboard case as well.

## 11. Base components are the only place raw elements are allowed

**Context.** Before Phase 3, four files in `frontend/app/` carried their
own copies of the same `<button>`, `<input>`, `<select>` and `<label>`
markup with matching class strings. The copies drifted, and the drift is
what let the admin allowlist's mobile overflow go unnoticed: styling
lived in pages, not in a component that a rule could protect.

**Decision.** Move every shared control into `frontend/components/base/`
and forbid raw elements in `frontend/app/` via lint. The rule arrives in
Phase 4 as `react/forbid-elements`, first as `warn` to confirm it fires,
then as `error`, with `frontend/components/base/**` exempt.

**Consequence.** After Phase 3, `grep -rn '<button|<input|<select'
frontend/app` returns nothing. Adding a new form control to a page
requires either using a Base component or changing the lint
configuration, both of which are reviewable. The trade is that a
one-off control which does not fit any Base component cannot be added
without a decision, which is the intended cost.

**Scope.** This is about `frontend/app/`. Base components themselves use
raw elements by necessity and are exempt from the rule.

## 12. Lint is enforced in CI, not only locally

**Context.** Next 16 does not run ESLint during `next build`. The lint rules
added in Phase 4 (`react/forbid-elements`, `no-restricted-syntax` for
className patterns) therefore had no effect on the deployed Pages site:
they only ran when a developer remembered to type `npm run lint`.

**Decision.** Add a `Lint` step to `.github/workflows/deploy-frontend.yml`,
between `Install dependencies` and `Build static site`. The step runs
`npm run lint` with no extra flags; a rule violation fails the workflow
and blocks the Pages deploy.

**Consequence.** The rules from Phase 4 — `react/forbid-elements` and the
three `className` patterns under `no-restricted-syntax` — are now enforced
on every push that touches `frontend/**`, not only on the machine of
whoever remembered to run lint. The workflow triggers on `push` to `main`
and on `workflow_dispatch`; there is no `pull_request` trigger, so a
violation does not prevent the commit from landing on `main`. What it does
prevent is the deploy: the job fails before the artifact is uploaded, so
the site keeps serving the last commit that passed.

**Measured (Phase 5).** With a deliberate probe in `frontend/app/`
containing a raw `<button>` and a `rounded-md` class:

| Command | Exit | Output |
| --- | --- | --- |
| `npm run lint` | 1 | one error per violation (`no-restricted-syntax`, `react/forbid-elements`) |
| `npm run build` | 0 | `✓ Compiled successfully`; the string `eslint` appears nowhere in the build log |

That is the pair of measurements behind the first sentence of this entry:
the rule is enforced, and `next build` is not the thing enforcing it.

**Why not `--max-warnings=0`.** The rules run at level `error`, not `warn`,
so no warning-only pass exists to suppress. Adding `--max-warnings=0` would
have no effect today, and would give a false sense of stricter enforcement
if a future rule is added at `warn` and meant to be non-blocking.

## 13. Dark mode is a mode attribute, not a second theme

**Context.** `frontend/app/globals.css` has carried a
`[data-theme="zorn"][data-mode="dark"]` token block since the token layer
existed, and `ARCHITECTURE.md` §4.6 specifies an inline FOUC script, but nothing
ever set `data-mode` and dark mode was unreachable at runtime.

**Decision.** Mode is orthogonal to theme. A theme selects a palette family
(`zorn`, later `mono`), and a mode selects the light or dark block inside it, so
one theme owns both modes and `mode` is a second attribute rather than a second
theme. `frontend/lib/theme-context.tsx` therefore hardcodes `zorn` and exposes
only `{ mode, toggleMode }`. The switch writes `data-theme` and `data-mode` on
`<html>`, persists the mode under `localStorage.mode`, and notifies subscribers.

**Why an inline script, not a React effect.** A `useEffect` runs after the
bundle has been fetched, parsed and committed, which is after the first paint.
Reading the preference there would paint the light canvas first and the dark one
a frame or more later — the flash the mechanism exists to prevent. The script in
`app/layout.tsx` runs synchronously while `<head>` is parsed, before the body
exists, so the correct token block applies to the first painted frame.

**Why the provider reads the DOM, not `localStorage`.** The inline script is the
single place that resolves the persisted preference and the
`prefers-color-scheme` fallback. A second reader could disagree with it, and the
disagreement would surface as a one-frame flash. The provider instead treats
`<html data-mode>` as an external store and subscribes with
`useSyncExternalStore`, which is also what `react-hooks/set-state-in-effect`
requires of a component that synchronises with an external system.

**Consequence.** `<html>` must not declare `data-theme` or `data-mode` in JSX:
React would overwrite the script's work during hydration. The script is the only
statement of the initial attributes. The toggle's label is server-rendered as
"Dark" and corrected to "Light" after hydration when the script resolved dark,
so only text flips, never colour. `data-mode` drives the CSS cascade, so no
component re-render is needed for the colours to change.

**Measured (headless Chrome).** With `localStorage` empty and
`prefers-color-scheme: dark`, the DOM probe registered at the earliest moment
`document.body` existed — before React hydrated — reported `mode=dark`,
`bg=rgb(26, 23, 20)`. The full matrix, the toggle round-trip and the persistence
test are in entry 14's phase report; the contrast consequences are in entry 14.

**Serialization note.** Next emits its own `<meta>`, `<title>`, preloads and
async bundle tags into `<head>` ahead of the layout-rendered `<script>`, so the
script is inside `<head>` but not literally its first child in the exported
HTML. It is still synchronous and still runs before the body and before any
React bundle executes, which is the property that matters.

## 14. Contrast re-measured in a rendered browser

**Context.** Entries 3, 5 and 7 computed light- and dark-mode ratios from the
token values in `globals.css`. The light values were later observed in a
browser; the dark values could not be, because entry 13 had not yet wired
`data-mode` to anything and dark mode was unreachable.

**Method.** `frontend/out/` was served over HTTP and driven by headless Chrome
(154.0.8037.57). The mode was set from `localStorage`/`matchMedia` at
document-start, the tokens were read with
`getComputedStyle(document.documentElement).getPropertyValue("--theme-*")`, and
the painted surface with `getComputedStyle(document.body)`. Ratios use the same
WCAG 2.1 relative luminance formula as entry 3; the sanity pair black on white
returned **21.00:1**, as expected. Painted backgrounds matched the tokens:
light `rgb(241, 234, 217)`, dark `rgb(26, 23, 20)`.

| Pair | Light | Dark | Threshold |
| --- | --- | --- | --- |
| `fg` on `bg` | 13.95:1 | 14.88:1 | AA 4.5:1 — pass both |
| `muted` on `bg` | 5.63:1 | 7.81:1 | AA 4.5:1 — pass both |
| `cta` on `bg` | 4.27:1 | 4.99:1 | AA 4.5:1 — **fail light**, pass dark |
| `bg` on `cta` (fill/hover) | 4.27:1 | 4.99:1 | AA 4.5:1 — **fail light**, pass dark |
| `accent` on `bg` (context) | 2.30:1 | 8.18:1 | 1.4.11 3:1 — **fail light**, pass dark |

`bg` on `cta` is the same pair as `cta` on `bg` read in the other direction, so
the `cta` variant's fill and its hover inversion share one ratio. Focus rings
were also re-measured: the toggle paints `outline: 2px solid rgb(193, 68, 14)`
at `outline-offset: 2px` in light mode and `rgb(224, 96, 42)` in dark mode, both
the `cta` token, with `:focus-visible` matching in both.

**Result.** Every measured value agrees with entries 3, 5 and 7 to two decimals.
No token was changed; the light-mode Vermilion gap (4.27:1) remains the accepted
limitation recorded in entry 3. The dark-mode ratios are now rendered
measurements rather than calculations.

## 15. Authorization lives on controllers, not in SecurityConfig

**Context.** SecurityConfig currently lists path-prefix rules
(/api/admin/** requires ADMIN, /api/** requires authentication).
With one controller this is fine. With six or more it becomes a
second place to look for every route's authorization, and a new
controller added without a corresponding rule is silently
misconfigured.

**Decision.** New controllers declare authorization at class level
with @PreAuthorize. SecurityConfig keeps only the coarse rules:
/api/auth/** permitAll, everything else authenticated. Existing
controllers are migrated when they are next modified for another
reason.

**Consequence.** Authorization lives next to the code it protects;
removing a controller removes its rule automatically. SecurityConfig
stays short. The cost is that reading one endpoint's authorization
requires opening the controller, not the config — a trade the
project prefers.

## 16. Podcast ownership is keyed on `allowed_users.email`, not a `users` table

**Context.** The Phase A brief specified
`subscription.user_id BIGINT NOT NULL REFERENCES users(id)` and the same for
`playback_state`. No `users` table exists in this database, and no migration
creates one. Identity here is the e-mail address: Supabase Auth issues the JWT,
`SecurityConfig` verifies it and rejects addresses that are not in the
allowlist, `WhitelistService` resolves the role from `allowed_users` whose
primary key is `email` (`V1__create_allowed_users.sql`), and `MeController`
returns that same address. Nothing in the backend ever produces a numeric user
id, so the specified foreign key could not be satisfied by any existing table —
`V2` would have failed at migration time, before Hibernate could validate
anything.

**Decision.** `subscription` and `playback_state` are keyed on
`user_email TEXT NOT NULL REFERENCES allowed_users(email) ON DELETE CASCADE`,
and their repositories query by `userEmail`. No user table is introduced. The
compound keys are otherwise exactly as specified, and the rest of `V2` is
unchanged.

**Consequence.**

- **The allowlist row *is* the user record.** Deleting an entry now also
  deletes that user's subscriptions and playback state, through the cascade
  from `allowed_users`. That matches the intent of both revocation and the
  "Delete account" backlog item, but it is a data-destroying side effect that
  `AdminUserController`'s remove action does not warn about yet.
- **The stored address must be normalised.** `WhitelistService` normalises with
  `Emails.normalize` (trim and lower case) before lookup, so a writer that
  stores an un-normalised address produces a foreign key violation rather than
  a missing row. Phase B must normalise before inserting.
- **A changed e-mail address loses history.** If the address in the allowlist
  ever changes, the user's subscriptions and playback state do not follow it.
  Google addresses do not normally change, and no such feature is planned.
- **A numeric user table becomes worthwhile only if identity is split from the
  allowlist** — for example a second provider sharing one account. That is a
  backlog item, not a plan, so the indirection is not paid for today.


## 17. RSS parsing uses Rome

**Context.** Phase B ingests podcast feeds, which arrive as RSS 2.0, RSS
1.0, or Atom. The formats overlap but are not identical, and real feeds
routinely deviate: missing GUIDs, non-ASCII in titles, escaped HTML in
descriptions, self-closing tags that are not valid XML, BOM at the start
of the document. Handling those deviations is the bulk of the work, and
it is not work unique to this project.

**Alternatives considered.**

| Option | What it gives | What it costs |
| --- | --- | --- |
| `com.rometools:rome` | RSS 0.9x/1.0/2.0 and Atom; handles BOM, encoding, malformed XML; actively maintained; widely used | ~600 KB of classes, most of which the project will not use |
| `com.github.dorkbox:RSSReader` | Small API, single-purpose | Fewer formats supported, smaller community, less tolerant of bad feeds |
| Hand-written StAX parser | No dependency | Re-implements the deviation handling above; likely to ship bugs the community already solved |

**Decision.** Use Rome. It is the standard choice for Java podcast and
feed readers, and it is tolerant of exactly the malformed input a real
subscription flow encounters.

**Consequence.** One new backend dependency. It lives in `pom.xml`
alongside the existing Spring Boot starters and is versioned via Spring
Boot's dependency management where possible (Rome is not managed by the
Spring Boot BOM). The
`RssFeedParser` service is a thin wrapper around Rome's
`SyndFeedInput`; the parser output is mapped to the project's own
`ParsedFeed` and `ParsedEpisode` records so that no Rome types leak into
the domain layer. If Rome is ever replaced, only the wrapper changes.

**Impact on `subscription` and `playback_state` keys.** None. The feed
parsing is orthogonal to the schema.

**Review trigger.** If Rome's transitive dependency tree ever conflicts
with a Spring Boot upgrade, or if the project's feed parsing needs grow
into podcast-specific features Rome does not provide (chapter markers,
transcripts), revisit. Until then, Rome is the deliberate choice and the
cost is accepted.

## 18. Next.js owns `out/404.html`, so the project's SPA fallback does not ship

**Context.** Phase C added a dynamic route (`/podcasts/[id]`) to a site hosted on
GitHub Pages, which serves one file per path and has no rewrite rules. The plan
was the classic fallback: `frontend/public/404.html` parks the requested path in
`sessionStorage`, redirects to `/`, and `app/page.tsx` restores the path on
mount. `docs/roadmap/library-ui.md` lists that file as a deliverable and notes it
is the same one Phase F would have needed.

**Measurement.** With `output: 'export'`, Next 16 also writes `out/404.html`, from
the `_not-found` route, after it has copied `public/`. Measured on the Phase C
build:

- `public/404.html` is 1587 bytes and contains `spa-fallback-path`.
- `out/404.html` is 11116 bytes, byte-identical to `out/_not-found.html` (`cmp`
  reports equal), with zero occurrences of `spa-fallback-path` and zero
  occurrences of "podcasts".

The file that ships is therefore Next's application shell, not the project's
redirect page, and the `sessionStorage` handshake never runs. The restore effect
in `app/page.tsx` is unreachable code in the deployed artifact.

**Decision.** Keep both files as they are: Next's `404.html` ships, and the
project's version stays in `public/` where it costs nothing and is the mechanism
if it is ever needed. Losing the redirect is not necessarily losing the
behaviour, because Next's 404.html *is* the app shell: a browser that lands on it
stays at the requested URL, which is stronger than the redirect dance — no flash
of the wrong page and no storage round trip. The export also contains
segment-level payloads for the dynamic route
(`out/podcasts/__next.podcasts.__PAGE__.txt`, `out/podcasts/__next._full.txt`,
`out/podcasts/__next._tree.txt`), which is what a client-side render of an
arbitrary id would need.

**Consequence — unresolved, and deliberately so.** Which mechanism actually
renders `/podcasts/42` on a hard reload is unverified, because this phase's
verification is the build and not the interaction. There are two possible
outcomes on the deployed site and one manual check decides between them: either
Next's shell resolves the route, in which case `public/404.html` and the restore
effect can both be deleted (the preferred outcome), or it does not, in which case
the fix is a post-build `cp public/404.html out/404.html` in
`.github/workflows/deploy-frontend.yml`, which makes the project's fallback win
at the cost of the redirect round trip.

**Review trigger.** Resolve this entry as soon as the deployed behaviour is
observed. Until then the limitation is accepted and recorded rather than
resolved.

## 19. Podcast detail is a static route with a query parameter

**Context.** Phase C first implemented the podcast detail view as
`/podcasts/[id]`, using Next.js's dynamic segment with
`generateStaticParams`. Under `output: 'export'`, an empty
`generateStaticParams` is rejected and the only alternative is a
placeholder id, which produces a single static file for an id that can
never exist. A hard reload on `/podcasts/1` therefore returns a 404 from
GitHub Pages, and the earlier `public/404.html` fallback (entry 18)
created an infinite redirect loop rather than fixing it.

**Decision.** The route is now `/podcasts/view?id={id}`, a static route
that reads the id from `useSearchParams()` inside a `Suspense` boundary.
`generateStaticParams` is gone. `public/404.html` is deleted, and the
`sessionStorage` restore effect in `app/page.tsx` is removed.

**Consequence.** Every podcast URL works on GitHub Pages without a
fallback: the file `out/podcasts/view.html` exists, and the query string
is preserved across hard reloads, bookmarks and shares. The cost is a
slightly longer URL (`/podcasts/view?id=1` instead of `/podcasts/1`).
Given the platform constraint, that is preferable to a route that only
works through client-side navigation.

**Supersedes entry 18.** Entry 18 described the 404-fallback mechanism
that this entry removes. It is left in place per the append-only rule;
its measurements remain accurate, its conclusion does not apply.

## 20. `/health` is public and does not touch the database

**Context.** Cloud Run runs with `--min-instances=0`, so the first
backend call after idle can take 20+ seconds while the container and the
JVM cold-start. The frontend needs a way to wake the container without
waiting for the user to trigger a real request.

**Decision.** Add a `HealthController` at the root package serving
`GET /health`, outside `/api/**`. It has no dependencies, performs no
database access, and returns `Map.of("status", "ok")`. It is public:
`SecurityConfig` already permits any path not under `/api/**`.

**Alternatives considered.**

| Option | Why not |
| --- | --- |
| Spring Boot Actuator at `/actuator/health` | Adds a dependency, exposes more than the endpoint needs, and pulls in DB health checks that would hit Supabase on every call. |
| `/api/health` with explicit `permitAll()` | Works, but adds configuration to `SecurityConfig` for no gain, and puts a liveness probe inside the API contract surface. |
| Private, called only by Cloud Run's own probe | Solves a different problem. The frontend cannot warm the container through a private endpoint. |

**Consequence.** Anyone who knows the URL can confirm the backend is
running. That information is already public: an anonymous request to
`/api/podcasts` returns `401` with
`WWW-Authenticate: Bearer resource_metadata="…"`, which reveals the
service exists and its OAuth metadata URL. Adding `/health` adds no new
information.

The endpoint responds in milliseconds when the container is warm, and
its only job when cold is to start the container. It is not a readiness
or liveness probe and does not report dependencies.

## 21. `/` is the library; the counter is retired as a landing page

**Context.** Step 1 shipped a counter to prove the frontend, backend and
Supabase were wired together. That job is done: `/health` (entry 20) and the
podcast API both exercise the same path end to end. The counter was still the
landing page, with a hardcoded link to `/podcasts`, so a visitor landed on a
diagnostic instead of the product.

**Decision.** The landing page is the subscription list. `/` and `/podcasts`
render the same `frontend/components/subscription-list.tsx`; the component is
not duplicated. The header shows "Home" before "Podcasts" for authenticated
users. A missing Supabase session is treated as a state, not an error: the list
renders "Sign in to see your podcasts" and points at the header's sign-in
button instead of a failure sentence.

**Consequence.** The frontend no longer calls `/api/counter`, but the backend
`CounterController`, the `Counter` entity and the `counter` table stay in
place. Removing them is a separate change: it needs a Flyway migration to drop
the table, and doing it here would mix a product change with a schema change.
With the frontend side gone, that follow-up has no UI to coordinate.

**Alternatives considered.** Keep `/` as the counter until the player exists,
rejected because the counter is a health check and `/health` now does that job
without a page. Redirect `/` to `/podcasts`, rejected because GitHub Pages
serves static files with no rewrite rules and a redirect adds a round trip for
the common case.


## 22. Read cache in localStorage, not IndexedDB, not a library

**Context.** Podcast lists and episode lists change rarely. The
backend runs on Cloud Run and each call is a network round trip, so
every navigation pays for data the browser has already seen. The
cold-start UX in entries 20 and 21 solved the wait itself; this entry
solves the repeat cost.

**Decision.** A small localStorage-backed read cache with
stale-while-revalidate semantics, behind the `PodcastSource` interface
added in this phase. No new dependency. The interface exists so a
future guest mode can supply a local source without touching
`subscription-list.tsx` or `episodes-view.tsx`.

**Alternatives considered.**

| Option | Why not |
| --- | --- |
| IndexedDB | Async, more code, no benefit for 50-100 KB of metadata. Correct choice for offline audio in Phase G. |
| SWR or TanStack Query | A dependency for a 50-line problem. Adds a mental model (keys, revalidation windows, mutation states) that the project does not need yet. |
| sessionStorage | Cleared on tab close, defeats the point for a returning user. |
| HTTP cache only | No control over staleness, no fallback when the network fails. |

**Consequence.** A cold Cloud Run container no longer blocks the first
render of a page the user has visited before. The cost is that the
cache can show data older than the server has. The TTL parameter was
removed in this phase, so the cache is returned regardless of age; a
"showing cached data" note tells the user when the fresh fetch failed.
Revisit if staleness becomes a real annoyance, which would mean
re-adding a TTL and surfacing it in the UI.

## 23. The header collapses into a disclosure below `md`

**Context.** The header was a single non-wrapping flex row holding the brand,
the e-mail, three navigation links, sign-out and the theme toggle. The e-mail
was already hidden below `sm`, but everything else still competed for one line,
and the row did not wrap. On a 375 px viewport the theme toggle, the right-most
control, was pushed past the viewport edge and rendered clipped. The same class
of bug — one layout cannot serve a phone and a desktop — was already solved once
for the admin allowlist in entry 9.

**Decision.** Keep one row at `md` and above, and below `md` collapse the
navigation into a disclosure opened by an icon button in the header. The
disclosure contains the e-mail, the same three links and sign-in/out, and
expands in the document flow under the header rather than floating over the
page. The theme toggle stays visible at every width and sits immediately before
the menu button: a single short label fits where the full navigation does not,
so the mode switch remains one tap away on a phone.

The breakpoint is `md`, matching entry 9, and the e-mail's `sm:inline` was
changed to `md:inline` so exactly one layout is active at a time. The two
layouts share one `HeaderNav` component rather than two copies of the link list,
which is the drift the base component layer was extracted to stop
(`frontend/components/base/README.md`).

**Why no headless primitive.** `docs/STYLEGUIDE.md` §7 and `ARCHITECTURE.md`
§4.5 reserve Radix for complex interactions (Slider, Dialog, Tabs). A
navigation disclosure is not one: it is a button that toggles links that are
already in the document flow, with no focus trap, no portal and no positioning.
Entry 1 still applies — Radix arrives with the first component that genuinely
needs it, which is the player scrubber or a dialog, not this.

**Consequence.**

- The links are reachable in the tab order in both layouts; the inactive
  layout's container is `display: none` (`hidden md:flex` / `md:hidden`) and is
  therefore not exposed to assistive technology, following entry 9.
- The disclosure button carries `aria-expanded`, `aria-controls` and a
  label that flips between "Open menu" and "Close menu". Escape closes it, and
  every link click inside it closes it.
- The menu button is an icon only, so it needs the `aria-label`; the glyph
  (three rules closed, a cross open) is an inline SVG that strokes
  `currentColor`. No icon dependency is introduced, and the stroke follows the
  `fg` token because the button owns its colour.
- The disclosure is not rendered while `isLoading`, so a signed-out visitor
  never sees an empty panel.

**Alternatives considered.**

| Option | Why not |
| --- | --- |
| Let the row wrap | It turns one broken row into two broken rows; the toggle would still be the element that spills, and the brand-to-nav relationship would be lost. |
| `overflow-x-auto` on the header | Hides the problem behind a scrollbar and reintroduces horizontal scrolling, which `docs/DESIGN_NOTES.md` treats as a measurable defect (`scrollWidth == clientWidth`). |
| Radix `DropdownMenu` | A dependency and a positioning/portal model for a disclosure that fits in the flow. See entry 1. |
| Icons for every link instead of text | Four nested meanings to learn, and `docs/STYLEGUIDE.md` §4 keeps the header typographic. The one icon that remains (the menu glyph) is conventional. |
