# Backlog

Features that are wanted but not yet scheduled. Each entry states what it
would enable, so it can be prioritised later without re-reading old chats.

## Playback

- **Playback speed control** (0.5× to 2×). Podcast listeners routinely
  listen at 1.25× or 1.5×. Requires a `<select>` in the full player and a
  `playbackRate` write to the `<audio>` element.
- **Skip silence.** Removes gaps in speech. Requires analysing the audio
  stream, which is non-trivial in a browser.
- **Sleep timer.** Common for bedtime listening. Stops playback after N
  minutes or at end of episode. UI-only, no backend.

## Player

- **Render episode descriptions as formatted text.** Feed descriptions carry
  HTML (`<p>`, `<br>`, links), but the full player shows the raw markup as
  escaped text, so the tags are visible. Two options, neither chosen: sanitise
  on the client (a sanitiser dependency, plus a policy for what is allowed), or
  strip the markup in the backend at ingest (loses links and changes the API
  contract). This is a decision, not a fix.

## Design

- **Play/pause as symbols instead of text labels.** The player currently says
  "Play"/"Pause". A symbol is a typographic change, not a style change: which
  glyph, and whether the header should also carry icons, belongs with the
  skins work. Not scheduled.
- **Swipe navigation in the full player.** Right for programme notes, left for
  the queue. Needs a gesture design, a transition model, and a decision about
  where the "views" live. Not scheduled.

## Library

- **OPML import/export.** Standard interchange format between podcast apps.
  Lets users migrate their subscriptions from Overcast, Pocket Casts, etc.
- **Episode search across subscribed podcasts.** Needs indexing.
- **Playlists / queues.** Ordered playback of multiple episodes.
- **Differentiate / from /podcasts.** Today both render the same
  subscription list. When playback exists, / should surface "Continue
  listening" first, with the full library reachable via /podcasts.
  Requires Phase E (playback state). See DECISIONS entry 21.

## Sync

- **Cross-device playback position.** Already planned for Playback State.
  See roadmap/playback-state.md.
- **Mark as played / unplayed.** Manual override on top of automatic.

## Auth & accounts

- **Second provider (GitHub, Apple).** Currently Google-only. See
  DECISIONS entry 16 for why only one provider exists today.
- **Delete account.** GDPR-adjacent. Would delete the user row and cascade
  to subscriptions and playback state.

## Operations

- **Migrate `SPRING_DATASOURCE_PASSWORD` to Secret Manager.**
  Already in Step 5 of the roadmap.

## Performance

- **Lazy-load the hatman figure.** The inlined SVG is 80 KB
  (frontend/components/hatman-waking.tsx) and ends up in the shared
  layout chunk, so every page loads it even when the notice never
  appears. Wrap the import in next/dynamic with ssr:false so it lands
  in a separate chunk that loads only after the 2-second threshold.
  Reconsider the figure's complexity at the same time — the icon is a
  bitmap trace, not a hand-drawn vector, and 40×40 does not need
  12 paths.


## Guest mode

Two tiers. Not scheduled; after Phase D at the earliest.

- Tier A — curated demo. Five to ten podcasts bundled as static JSON
  in `public/demo-podcasts.json`. Full browse and playback without
  signing in. Zero backend, zero Supabase.
- Tier B — paste-your-own-feed. The browser fetches and parses the
  RSS. Works only where the feed host sends CORS headers (Acast,
  Megaphone, Buzzsprout, Anchor do; Apple does not). Fall back to
  "Sign in to try this feed" when CORS blocks.

Both require a `local-source.ts` implementation of `PodcastSource`.
The interface exists in `frontend/lib/podcast-source.ts` so neither
tier requires rewriting consumers.