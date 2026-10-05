# Phase F — PWA and Media Session

Make the app installable, integrate with the OS media controls (lock screen,
notification shade, headphone buttons), and cache enough metadata to open
without a network round trip. Offline *audio* is Phase G.

**Status: not started.**

## Deliverables

- `frontend/app/manifest.ts` — a web app manifest. Name, short name, start URL,
  display mode `standalone`, theme colour and background colour from the Zorn
  tokens, and the two existing icons (`app/icon.svg`, `app/apple-icon.png`).
  The static export writes `manifest.webmanifest` next to the HTML.
- A service worker, registered from a small client component in
  `frontend/app/layout.tsx`. Its job in this phase is narrow: serve the app
  shell from cache so a cold open paints before the network answers, and
  leave API calls alone. `next-pwa` and `serwist` are the two maintained
  options; adding either is a `DECISIONS.md` entry, because a service worker
  changes the failure modes of every subsequent deploy.
- Media Session handlers in `PlayerProvider`: `navigator.mediaSession.metadata`
  is set on episode change, and `setActionHandler` is registered for
  `play`, `pause`, `seekbackward` and `seekforward`. The position state is
  updated on the same cadence as the scrubber.
- `docs/DECISIONS.md` entries for the service-worker library choice, the
  cache strategy, and the Media Session artwork source.
- `docs/ROADMAP.md` — mark Phase F in progress.

## Acceptance criteria

- `npm run lint` and `npm run build` exit 0, and `out/manifest.webmanifest`
  exists in the exported site.
- Chrome on Android and Safari on iOS both offer "Add to home screen" when the
  site is opened. Verified on a real device, not in DevTools — the install
  prompt has platform-specific heuristics.
- With the app installed, pressing the headphone play/pause button toggles
  playback, and the lock screen shows the episode title and artwork.
- Opening the installed app with the network disabled (Chrome DevTools
  offline, or airplane mode) paints the shell and the last-viewed page from
  cache. The episode list may be stale; it must not be a blank screen.
- A code change that breaks the service worker does not leave the installed
  app permanently broken. Verified by bumping the cache version and observing
  the update.

## Out of scope

- Offline audio download. Phase G.
- Background audio playback beyond what the `<audio>` element already does
  when the tab is backgrounded.
- Push notifications.
- A custom install prompt. The browser's own is enough.
- Live position sync with the backend while offline. Phase E writes are lost
  if the network is gone; Phase F does not change that.

## Notes

### The service worker is the risky part

Everything else in this phase is additive. A service worker is not: once
registered, it sits between the app and the network, and a bad cache strategy
can serve stale HTML for a page that has changed shape. The rule for this
phase is narrow scope and versioned caches. The worker caches the app shell and
nothing else. Every release bumps the cache name, so a deploy evicts the
previous one.

If `next-pwa` and `serwist` both look like more than the phase needs, a
hand-written worker of thirty lines is defensible and has no dependency. That
is a decision to make when the phase starts, not now.

### Media Session artwork and the `no-img-element` exemption

`DECISIONS.md` entry 33 turns off `@next/next/no-img-element` because every
in-page `<img>` is third-party feed artwork under `output: 'export'`, where no
optimizer exists. Media Session artwork is a different path: it is fetched by
the OS, not by the page, and it is set through
`MediaMetadata({ artwork: [{ src, sizes, type }] })`. The exemption in entry 33
does not apply to it, because there is no `<img>` element involved. If the
artwork URL is a feed URL, it needs the same CORS and availability reasoning as
the in-page image, and the browser's lock-screen fetch may fail where the page
fetch succeeded. Test on a real device.

### iOS Safari is the harder target

The manifest, the install prompt and the Media Session API are all
differently-implemented on iOS. Plan for the acceptance criteria to be met on
Android first, then iterated on iOS, rather than treating them as one platform.