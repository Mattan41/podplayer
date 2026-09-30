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

## Library

- **OPML import/export.** Standard interchange format between podcast apps.
  Lets users migrate their subscriptions from Overcast, Pocket Casts, etc.
- **Episode search across subscribed podcasts.** Needs indexing.
- **Playlists / queues.** Ordered playback of multiple episodes.

## Sync

- **Cross-device playback position.** Already planned for Playback State.
  See roadmap/playback-state.md.
- **Mark as played / unplayed.** Manual override on top of automatic.

## Auth & accounts

- **Second provider (GitHub, Apple).** Currently Google-only. See
  DECISIONS entry 1 for why only one provider exists today.
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


  ## Guest mode without login
  loaclstorage? obs! iphone limit 50 mb.  