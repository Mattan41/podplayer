# Phase D — Playback engine

Play the episodes the library lists. A single `<audio>` element, a mini player
that persists across routes, and a full player that expands over the current
view. No state is saved to the backend; that is Phase E.

**Status: in progress.** Frontend code complete, lint and build green, browser
behaviour measured in headless Chrome. Not yet committed. Beyond the two doc
files named below, `frontend/components/base/README.md`, `ARCHITECTURE.md` §2
and the approved-dependency table in `docs/DESIGN_NOTES.md` were also updated,
because the base component API and the stack changed. See `DECISIONS.md`
entries 26–30.

## Deliverables

Frontend, new:

- `frontend/lib/player-context.tsx` — `PlayerProvider` and `usePlayer()`. Owns
  the playback state machine and exposes `playEpisode`, `toggle`, `seek`,
  `stop`. Built with `useReducer` + Context. See the Zustand note below.
- `frontend/components/player/audio-element.tsx` — the single `<audio>` tag.
  Rendered once, in the layout. Controlled imperatively through the context.
- `frontend/components/player/mini-player.tsx` — a fixed bar at the bottom of
  the viewport, visible on every route when an episode is loaded.
- `frontend/components/player/full-player.tsx` — a Radix Dialog with the large
  player view: artwork, title, description, scrubber, elapsed and total time.
- `frontend/components/player/scrubber.tsx` — the shared scrubber used by both
  players. Wraps `BaseSlider` and adds the time readouts.
- `frontend/components/base/BaseSlider.tsx` — `@radix-ui/react-slider` wrapped
  in the base layer.
- `frontend/components/base/BaseDialog.tsx` — `@radix-ui/react-dialog` wrapped
  in the base layer.

Frontend, changed:

- `frontend/components/base/index.ts` — export `BaseSlider` and `BaseDialog`.
- `frontend/app/layout.tsx` — mount `PlayerProvider`, `<AudioElement />` and
  `<MiniPlayer />` inside the existing provider tree.
- `frontend/app/podcasts/view/episodes-view.tsx` — add a play button to each
  episode row. This is the only page that triggers playback in this phase.

Backend: nothing. `EpisodeDto` already carries `audioUrl`. `docs/api/podcasts.md`
is unchanged.

Docs:

- `docs/DECISIONS.md` — new entries: (1) the audio element lives in the layout
  and is a singleton; (2) the full player is a Dialog, not a route; (3) Radix is
  installed now, per entry 1's trigger; (4) `PlayerProvider` state shape and why
  Context is enough until Phase E proves otherwise; (5) `EpisodeDto` is the type
  the player consumes, not a new `PlayableEpisode`.
- `docs/ROADMAP.md` — mark Phase D in progress.

## Acceptance criteria

`npm run lint` exits 0. `npm run build` exits 0 with `output: 'export'`.

Measured in the browser after `npm run dev`:

- Clicking a play button on an episode row starts playback. The button is a
  `BaseButton`; no raw `<button>` is added to `frontend/app/`.
- The mini player appears at the bottom of the viewport and shows the episode
  title and the play/pause state.
- Navigating to `/podcasts` and back does not stop playback. Verified by ear and
  by checking `document.querySelectorAll('audio').length === 1` after each
  navigation.
- The mini player's play/pause button toggles playback. The scrubber seeks.
- Clicking the mini player's expand control opens the full player.
- The full player shows artwork, title, elapsed and total time, a scrubber, and
  a play/pause control. Escape closes it. Tab focus stays inside while it is
  open.
- `grep -rn '<audio' frontend/app frontend/components` returns exactly one
  occurrence, in `audio-element.tsx`.
- `grep zustand frontend/package.json` returns nothing.
- `grep -rn '@radix-ui' frontend/package.json` returns exactly two entries:
  `@radix-ui/react-slider` and `@radix-ui/react-dialog`.
- An episode whose `audioUrl` returns 404 shows a message and does not crash the
  app. The mini player closes.

## Out of scope

- Saving playback position to the backend. Phase E.
- Resuming from a saved position on mount. Phase E.
- Cross-device sync. Phase E.
- Media Session API (lock-screen controls). Phase F.
- PWA / install prompt / offline. Phase F and G.
- Playback speed, skip silence, sleep timer. BACKLOG.
- Queue, playlist, autoplay next. BACKLOG.
- Volume control. Not scheduled. Native browser volume is the only control in
  this phase.
- Video podcasts. Not scheduled.
- Chapters, transcripts. Not scheduled.
- Frontend test harness (vitest / jest / testing-library). See the Testing note.

## Notes

### The `<audio>` element is a singleton, and it lives in the layout

Every route that can play an episode needs the same `<audio>` element, and
navigating between routes must not interrupt playback. The element is therefore
rendered once, in `frontend/app/layout.tsx`, and its `src` is set imperatively
from `PlayerProvider`:

```tsx
useEffect(() => {
  const audio = ref.current;
  if (!audio || !episode) return;
  audio.src = episode.audioUrl;
  audio.play().catch((error) => dispatch({ type: "error", message: ... }));
}, [episode]);