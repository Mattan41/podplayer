# Base components

Shared UI primitives for Podplayer. **This file is the source of truth** for their
API and for the conventions that apply to everything in this folder.
`ARCHITECTURE.md` §4.5 links here rather than duplicating the specification.

## Purpose

Three files, `frontend/app/page.tsx`, `frontend/app/admin/page.tsx` and
`frontend/app/header.tsx`, each carried their own copy of the same button, input
and label class strings. The copies drifted, and the copies were the reason a
mobile layout bug in the admin allowlist went unnoticed: styling lived in pages
instead of in components.

Shared controls now live here, styled only through the semantic theme tokens
(`bg-bg`, `text-fg`, `text-muted`, `border-fg`, `text-cta`, `bg-cta`,
`outline-cta`). No hex
values, no palette names, no Tailwind `dark:` variant.

## Components

| Component | Element | Purpose |
| --- | --- | --- |
| `BaseButton` | `<button>` | Every button. Variants `outline`, `cta`, `danger`; sizes `sm`, `md`. |
| `BaseCard` | `<div>` | Bordered surface. Owns no padding, width or margin. |
| `BaseField` | `<label>` | Labels one control in the standard stacked layout. |
| `BaseInput` | `<input>` | Single-line text input. Supports `invalid`. |
| `BaseSelect` | `<select>` | Native select. Supports `invalid`. |
| `BaseDialog` | Radix Dialog | Modal dialog; focus trap and Escape close. **Client component.** |
| `BaseSlider` | Radix Slider | Seek/progress slider; thumb is a focal circle. **Client component.** |

Import through the barrel:

```tsx
import { BaseButton, BaseCard, BaseDialog, BaseField, BaseInput, BaseSelect, BaseSlider } from "@/components/base";
```

`cn` and the internal class constants are deliberately not exported.

## BaseButton

| Prop | Type | Default |
| --- | --- | --- |
| `variant` | `"outline" \| "cta" \| "danger"` | `"outline"` |
| `size` | `"sm" \| "md"` | `"sm"` |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` |

Every other native `<button>` prop is forwarded.

| Variant | Appearance | Use for |
| --- | --- | --- |
| `outline` | 1px `border-fg`, transparent, inverts on hover | Neutral and secondary actions |
| `cta` | 2px `border-cta`, filled `bg-cta`, inverts on hover | The one primary action in a view |
| `danger` | 1px `border-cta`, `text-cta`, fills on hover | Destructive actions |

`type` defaults to `"button"`, so a button placed inside a form never submits by
accident. Pass `type="submit"` where that is intended.

### Extending the variants

A new variant is added only when all three of these hold:

1. There is a real use case, not a hypothetical one.
2. It needs a combination of the four semantic tokens that no existing variant
   covers.
3. The addition is recorded in `docs/DECISIONS.md`.

`danger` was added under this rule; see `docs/DECISIONS.md` entry 3. A request that
satisfies only condition 2 is a refactor of an existing variant, not a new one.

## BaseCard

| Prop | Type | Default |
| --- | --- | --- |
| `children` | `ReactNode` | – |
| `className` | `string` | – |

Renders `rounded-base border border-fg bg-bg`. It owns no padding, width or
margin, so the caller composes the box:

```tsx
<BaseCard className="p-6">...</BaseCard>
<BaseCard className="w-full max-w-md p-8">...</BaseCard>
```

Separation is a 1px border rather than a shadow, per `ARCHITECTURE.md` §4.4.

## BaseField

| Prop | Type | Default |
| --- | --- | --- |
| `label` | `string` | – |
| `children` | `ReactNode` | – |
| `className` | `string` | – |

Renders a `<label>` with a muted (`text-muted`) `text-xs` caption above the control:

```tsx
<BaseField label="Email">
  <BaseInput type="email" required value={email} onChange={onEmailChange} />
</BaseField>
```

### Label association

`BaseField` **wraps** its control in the `<label>` instead of pointing at it with
`htmlFor`. That gives an implicit label association, and it reproduces the markup
already used in `frontend/app/admin/page.tsx`, so no `id` has to be generated or
threaded through the caller.

`useId` plus `htmlFor` is the alternative, and it is available in synchronous
Server Components: React documents exactly one restriction, *"useId currently
cannot be used in async Server Components"*. It was not chosen because it adds id
plumbing for no observable gain with one control per field. If a case appears
where the label is **not** adjacent to its control, such as a radio group or a
detached caption, switch to `useId` and `htmlFor` and record the change.

### Errors

`BaseField` does not render error messages, which is what keeps it hook-free. A
caller that needs one renders the message itself, gives it an `id`, and links it to
the control with `aria-describedby`, passing that through to `BaseInput` or
`BaseSelect`.

## BaseInput and BaseSelect

| Prop | Type | Default |
| --- | --- | --- |
| `invalid` | `boolean` | `false` |

Both forward every native prop, so `type` (`email`, `text`, `datetime-local`, ...),
`required`, `disabled`, `value`, `onChange`, `aria-*` and `data-*` all pass
through. `type` is given no default on purpose: native `<input>` already defaults
to `text`, so a default here would only hide the author's intent.

`invalid` sets `aria-invalid` and switches the border to `border-cta`. The border
stays 1px deliberately: a 2px border would reflow the field by one pixel the moment
an error appears. The color carries the visual signal and `aria-invalid` carries it
for assistive technology.

> `invalid` is reserved API. No caller uses it yet, because the admin form shows a
> single form-level error rather than per-field errors. It exists so that adding
> per-field validation later does not change this API.

`disabled` is styled in the shared control classes (`disabled:cursor-not-allowed
disabled:opacity-50`), matching `BaseButton`.

`BaseSelect` wraps a native `<select>`; `docs/DECISIONS.md` entry 2 records why a
Radix Select was not used.

## BaseSlider

A slider built on `@radix-ui/react-slider` — the first component that genuinely
needed a headless primitive (`docs/DECISIONS.md` entries 1 and 28).

| Prop | Type | Default |
| --- | --- | --- |
| `value` | `number` | – |
| `min` | `number` | `0` |
| `max` | `number` | – |
| `step` | `number` | `1` |
| `disabled` | `boolean` | `false` |
| `onValueChange` | `(value: number) => void` | – |
| `onValueCommit` | `(value: number) => void` | – |
| `aria-label` | `string` | – |
| `className` | `string` | – |

The value is controlled and the caller owns it: pass the current value in, and
update it from `onValueChange` (continuous, while dragging) or `onValueCommit`
(once, on release). `max` must be greater than `min`, so a caller with an unknown
range passes a placeholder max and disables the slider.

The track is a 1px `fg` hairline, the filled portion is `accent`, and the thumb is
a focal circle (`rounded-full`) bordered in `cta` — one of the three places full
rounding is allowed. **No width is set**, because layout belongs to the caller
(Convention 2); a slider in a flex row passes `flex-1`.

**It is a client component**, unlike the button/card/field/input/select set,
because Radix uses hooks. That pulls a client boundary up the tree for every
consumer; see Convention 3 and `docs/DECISIONS.md` entry 28.

## BaseDialog

A modal dialog built on `@radix-ui/react-dialog`; the full player is its only
consumer in Phase D (`docs/DECISIONS.md` entry 27).

| Prop | Type | Default |
| --- | --- | --- |
| `open` | `boolean` | – |
| `onOpenChange` | `(open: boolean) => void` | – |
| `title` | `string` | – |
| `children` | `ReactNode` | – |
| `className` | `string` | – |

`title` is rendered as `Dialog.Title`, which Radix requires for an accessible
name; there is no description slot, so the content association is dropped
explicitly to avoid a runtime warning. Radix supplies the focus trap,
Escape-to-close and focus restoration. The scrim is a solid `fg` fill — there is
no overlay token, and an opacity utility on `fg` is banned (Convention 1).

**It is a client component**, for the same reason as `BaseSlider`.

## Conventions

### 1. Styling

Only semantic theme tokens. Never a hex value, never a palette name (`zorn-*`),
never Tailwind's `dark:` variant. Dark mode is a property of the theme, not of the
component; see `ARCHITECTURE.md` §4.6.

Secondary text uses `text-muted`, never an opacity utility such as `text-fg/70`. The
token holds a pre-computed value per theme and mode, so a skin can tint muted text
independently and its contrast is a deliberate choice rather than a side effect of
`fg`. See `docs/DECISIONS.md` entry 7 for the measured ratios.

`rounded-base` on every rectangular surface and control. It resolves through the
theme radius (`--theme-radius`), which Zorn sets to `0px`, so a skin can change
the corner radius without any component changing.

Fully circular elements are permitted in exactly two places (avatar, scrubber
handle). The scrubber handle (`BaseSlider`'s thumb) is the first to exist, as of
Phase D; the avatar is still only planned. Those keep `rounded-full` explicitly
and are deliberately not affected by the theme radius. The player controls are
rectangular `BaseButton`s, not focal circles. Never an intermediate radius
(`rounded-sm`, `rounded-md`, ...).

### 2. Base components must not set classes that callers are expected to override

This is why the project has no class-merging library. Classes are joined by a plain
helper (`cn`), so if a caller passes a class that conflicts with one the component
already set, **both** land in the `class` attribute and the winner depends on CSS
order. That is not a problem to paper over with `tailwind-merge`; it is a sign that
the component set a class it had no business setting.

In practice:

- `BaseCard` owns **no** padding, width, height or margin. Callers add `p-6`,
  `w-full`, `mt-4`.
- `BaseButton` owns its padding, border weight and font size, because those define
  what a button of a given `variant` and `size` is. Callers add layout only
  (`w-full`, `mt-6`), never padding or text size.
- `BaseInput` and `BaseSelect` own their padding, because a control's box is
  intrinsic to being a control. Callers add layout (`w-full`, `sm:col-span-2`).

Appearance classes belong to the component. Layout classes belong to the caller.

### 3. `"use client"` only where a primitive requires it

`BaseButton`, `BaseCard`, `BaseField`, `BaseInput` and `BaseSelect` declare no
client boundary. They contain no hooks and no browser API, so they belong to
whichever graph imports them: a client component inherits them, and a server
component can render them as static markup.

`BaseSlider` and `BaseDialog` are the exceptions. Radix uses hooks, so both
declare `"use client"` and pull a client boundary up the tree for every consumer
of the barrel. The decision is recorded in `docs/DECISIONS.md` entry 28, as this
section previously asked.

The consequence for the hook-free set, which is easy to hit: importing one of them
into a **server** component and passing an event handler fails at build time,
because functions cannot cross the server-to-client boundary.
`frontend/app/layout.tsx` is this app's only server component today, and it renders
`<Header />` successfully precisely because `frontend/app/header.tsx` declares its
own `"use client"`.

If another base component has to become a client component, record the decision
too: it moves the boundary up the tree for every consumer.

### 4. Focus indicators

Shared focus styling is `focus:outline-none focus-visible:outline-2
focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cta`,
used verbatim by `BaseButton` and by `CONTROL_CLASS` (shared by `BaseInput` and
`BaseSelect`).

`focus-visible:outline-solid` is not optional. Tailwind v4 compiles `outline-2` to
`outline-style: var(--tw-outline-style); outline-width: 2px`, and `focus:outline-none`
sets `--tw-outline-style: none`, so a ring declared with a width and a colour but no
explicit style is never painted. `docs/DECISIONS.md` entry 8 has the measurements and
the ordering caveat.

Vermilion is used rather than Yellow Ochre because Yellow Ochre on the light
background measures **2.30:1**, below the 3:1 that WCAG 1.4.11 requires for
non-text contrast, while Vermilion measures **4.27:1** in light mode and **4.99:1**
in dark mode. Both pass. `docs/STYLEGUIDE.md` §6 allows either color for a focus
indicator, and the palette itself is unchanged. See `docs/DECISIONS.md` entry 5 for
the full measurements.

On the `cta` and `danger` variants the ring shares the CTA color with the button's
own border or fill. Separation comes from `outline-offset-2`, which leaves two
pixels of page background between the border and the ring, so the ring reads as a
distinct outline rather than merging into the edge.

### 5. Accessibility baseline

- Labels are associated with their controls through `BaseField`.
- `disabled` and `invalid` are expressed with native attributes, never with color
  alone.
- Focus is restyled, never removed: keyboard focus paints a 2px `cta` ring (§4),
  while a mouse click paints nothing.

## Not here yet

`BaseModal` and `BaseTabs` remain absent. They need a headless primitive library;
`@radix-ui/*` is now installed (`BaseSlider` and `BaseDialog`, `docs/DECISIONS.md`
entry 28), so adding either is a component plus, for `BaseTabs`, the first real use
case. `docs/STYLEGUIDE.md` §7 keeps the project on one primitive library — Radix —
rather than mixing in a second.
