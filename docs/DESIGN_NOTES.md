# Design Notes — Podplayer

Living document capturing engineering principles, verification discipline,
and the boundaries between the different types of documentation in this
repository.

This is not a specification. It is a record of *how* the project is worked
on, distinct from `DECISIONS.md`, which records *what* was decided and why.

---

## Document roles

Four files describe this project, and they answer different questions.
Keeping them distinct is what stops them from drifting into each other.

| File | Answers | Update when |
| --- | --- | --- |
| `ARCHITECTURE.md` | What is the system, as it currently is? | The stack, structure, or principles change. |
| `docs/DECISIONS.md` | Why was this choice made, and what did it cost? | A non-obvious decision is made, or a known limitation is accepted. Append-only. |
| `docs/STYLEGUIDE.md` | How should visual design be reasoned about? | The design language itself changes. |
| `frontend/components/base/README.md` | What is the API of the Base components? | The Base component API changes. |

When code disagrees with `ARCHITECTURE.md`, update the document. Do not
let them drift silently. When a decision reverses an earlier one, add a
new entry rather than editing the old one, so the reasoning stays
auditable.

This file (`DESIGN_NOTES.md`) sits alongside them and answers a fifth
question: how is this project *worked on*?

---

## Verification principles

Every claim about the codebase must be verifiable by running a command.
"Looks correct" is not verification. "The focus ring works" is not
verification.

Measurements beat descriptions:

- Contrast ratios, not "looks accessible"
- Computed styles, not "looks correct"
- `grep` results, not "no instances exist"
- `curl` output, not "the endpoint responds"
- `scrollWidth == clientWidth`, not "no horizontal scroll"

`docs/DECISIONS.md` entry 8 is the clearest example: a focus ring was
defined, documented, and measured by hand for two phases before anyone
checked the computed `outline-style` and discovered it had never been
painted. Every subsequent claim about that ring is anchored to a
measurement, not a description.

### Agents systematically hallucinate file contents and rule references

When an agent (Cline, Claude, GPT, DeepSeek) says "as stated in X.md",
ask for the exact quote. If it cannot produce one, the rule does not
exist. Cline invented a `.clinerules` clause about folder-local
documentation precedence during the Phase 0 planning; it was not in the
file. The consequence of letting that stand would have been an
architectural rule that no human had ever agreed to.

The same applies to API surfaces. `@radix-ui/react-table` does not exist,
but an agent would happily plan around it if asked to "use Radix for the
table". Always verify the library exists before designing around it.

### When a fix does not work, document the failure

`DECISIONS.md` entry 5 introduced `outline-cta` as a fix for a contrast
problem, and entry 8 later recorded that the fix had no observable
effect because the outline was never painted in the first place. Entry 5
was not rewritten. A correction note was appended instead. Future-me
reading entry 5 first will see the cross-reference to entry 8 before
drawing conclusions.

---

## Approved dependencies

Adding a dependency is a long-term commitment: it must be kept current,
audited for vulnerabilities, and explained to anyone reviewing the
project. The bar is deliberately high.

Currently approved:

| Dependency | Approved in | Purpose |
| --- | --- | --- |
| `@supabase/supabase-js` | Phase 0 | OAuth flow and access-token retrieval. |
| `next` | Scaffolding | Framework. |
| `react`, `react-dom` | Scaffolding | Framework. |
| `tailwindcss` + PostCSS plugin | Scaffolding | Styling. |

Not approved, and the reason:

| Dependency | Reason |
| --- | --- |
| `tailwind-merge` | Not needed. Base components do not set classes callers are expected to override. See `frontend/components/base/README.md` §2. |
| `clsx` | Not needed. `cn` in `frontend/components/base/cn.ts` covers the requirement. |
| `@radix-ui/*` | Deferred. Install with the first component that genuinely requires it. See `DECISIONS.md` entry 1. |
| Any state library (Zustand, Redux, Jotai) | Not needed yet. React Context is sufficient for auth state. Revisit when playback state exists. |

A new dependency requires an entry in `DECISIONS.md` before it is added.
The entry must state the problem, the alternatives considered, and the
cost of the choice.

---

## PR-sized changes, one commit per phase

Long agent sessions lose coherence. They also tend to merge what should
be separate commits. The working pattern that has emerged:

1. **Phase 0.** Design decisions and documentation. No code.
2. **Phase N.** One coherent change. Scoped prompt with a clear
   deliverable and a "do not touch" list. One commit per phase.
3. **Verification.** The agent reports measurements, not descriptions.
   Diff review by a human before commit.

The three phases completed so far (base components, counter migration,
focus-ring fix, admin and header migration) each followed this shape.
The result is a commit history that can be `git bisect`-ed, and a set of
`DECISIONS.md` entries that map onto actual commits.

---

## The split between Zorn (default) and theme

The theme is a property of the `<html>` element, not of any component.
Components consume semantic tokens (`bg-bg`, `text-fg`, `text-muted`,
`bg-cta`, `rounded-base`) and let the active theme resolve them.

Two consequences that are easy to forget:

- **`--radius-base` is not readable as a CSS variable at runtime.** It is
  declared with `@theme inline`, which inlines the value into the utility
  class rather than emitting a custom property. Theme code therefore sets
  `--theme-radius`, and component code uses the `rounded-base` utility.
  See `DECISIONS.md` entry 6.
- **Shape is a theme property.** A future theme may set
  `--theme-radius` to something other than `0px`. Components cannot
  hardcode a specific radius.

---

## On AI-assisted development

This project is built with AI assistance (Cline, Claude, ChatGPT/DeepSeek).
This is deliberate and appropriate for 2026. The skill being developed is
not "write Java from scratch from memory". It is:

1. **Recognize when the agent is wrong.** Cline has produced several
   hypotheses that required human judgment to correct (`@Cacheable`
   null-key, `@Column` name mismatches, ES256 vs RS256 default, the
   invented `.clinerules` clause, the tailwind-merge recommendation).
2. **Ask "why" before "how".** The `@PreAuthorize` versus path-based
   authorization decision is not one an agent volunteers unprompted.
3. **Verify claims by measurement.** "It compiles" is not "it works".
4. **Know the domain well enough to evaluate.** A review that cannot
   evaluate the answer is decoration.

The same principles apply to `unseenservant`, which was built with AI
assistance during and after the thesis work.

---

## Open questions

- **Muted text on the admin table.** DECISIONS entry 7 documents that
  `text-fg/70` composites to one 8-bit step away from the rounded
  `--theme-muted`. Worth re-measuring if the palette ever changes.
- **Contrast on the danger variant.** DECISIONS entry 3 records that
  Vermilion on Flake White is 4.27:1, just below AA. Accepted for now.
  Revisit if a fifth color is ever considered.
- **Tab behaviour in `datetime-local`.** DECISIONS entry 10 records that
  a native `datetime-local` input consumes seven Tab presses in Chrome.
  Native behaviour, out of scope for the base components.
- **Focus ring on `cta` and `danger` variants.** The ring shares the CTA
  color with the button's own border. `outline-offset-2` separates them,
  but this is worth re-checking by eye whenever the button variants
  change. See `DECISIONS.md` entry 5.

---

## How to use this document

- **Before starting a new phase.** Skim "Verification principles" and
  "Approved dependencies".
- **After a phase completes.** If a new verification technique or a new
  pitfall was discovered, add it here.
- **When in doubt.** This is not a contract. If a principle here stops
  making sense, change it and note why.