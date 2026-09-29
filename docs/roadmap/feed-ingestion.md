# Phase B — Feed ingestion

Parse RSS and Atom feeds, persist the podcasts and episodes they describe, and
expose subscribe, refresh, subscription-list and episode-list endpoints.
No frontend, no playback, no subscription UI.

## Deliverables

- `backend/pom.xml`: `com.rometools:rome` 2.1.0, pinned explicitly because the
  Spring Boot BOM does not manage it. See `DECISIONS.md` entry 17.
- `podcast.feed` subpackage: `RssFeedParser` (whose only public method is
  `parse(String feedUrl)`), `ParsedFeed`, `ParsedEpisode`, `FeedFetchException`.
- `podcast` package: `PodcastService`, `PodcastController`, and the DTOs
  `PodcastDto`, `PodcastSummaryDto`, `EpisodeDto`, `SubscribeRequest`,
  `SubscribeResult`, `RefreshResult`. `EpisodeRepository` gains
  `countByPodcastId`.
- `RssFeedParserTest`, with an RSS 2.0 and an Atom fixture under
  `backend/src/test/resources/feeds/`.
- `docs/api/podcasts.md`, the first documented endpoint family.

## Acceptance criteria

- `./mvnw compile` exits 0.
- `./mvnw test` exits 0, with `BackendApplicationTests` still loading the
  context (the entities still match the schema) and `RssFeedParserTest` green.
- No dependency other than Rome. No schema change: V2 already has every column.
- No service, controller, DTO or test added to the auth or counter packages.
- No frontend file touched.

## Out of scope

- Frontend work of any kind; the counter and admin views are unchanged.
- Playback, playback state, and the subscription and episode UIs.
- OPML import/export, episode search, playlists. See `BACKLOG.md`.
- Downloading episode artwork or audio; only URLs are stored.
- Scheduled refresh. Refresh is on demand, per podcast.
- Controller-level tests, and any test that touches the live database.

## Notes

- **Transport is separate from parsing.** `RestClient` (servlet stack, not
  `WebClient`) performs the fetch with a 10-second connect and read timeout;
  Rome only ever sees a byte stream, so it never opens a connection of its own.
- **The guid is the idempotency key**, per feed: `(podcast_id, guid)`. A blank
  guid falls back to the enclosure URL. An item with neither is skipped and
  logged at WARN, and so is an item with no enclosure at all, because
  `episode.audio_url` is `NOT NULL` and an episode that cannot be played does
  not deserve a row. Uniqueness is checked in memory, not by catching the
  constraint: a failed insert aborts the surrounding PostgreSQL transaction and
  would take the subscription write down with it.
- **Duration** is read from `itunes:duration`, in sexagesimal or bare seconds,
  and is null otherwise.
- **The iTunes tags arrive as foreign markup, not as mapped fields.** Rome
  ships the Dublin Core, content, slash, syndication and GeoRSS modules in its
  core artifact but not the iTunes one, so `itunes:author`, `itunes:duration`
  and `itunes:image` are read out of `getForeignMarkup()`. Measured, not
  assumed: `RssFeedParserTest` asserts artwork, author and duration values that
  its fixtures supply only in iTunes form. The same measurement showed that Rome
  does **not** map RSS 2.0 `<managingEditor>` to an author at all, which is why
  the `itunes:author` fallback exists.
- **A DOCTYPE is refused.** `SyndFeedInput.setAllowDoctypes(false)`, so a feed
  carrying one is rejected as unreadable instead of being allowed to pull
  external entities into the parser (XXE). Accepted cost: the rare DTD-bearing
  feed cannot be subscribed to, and the error says so.
- **The user is the e-mail address.** Every method normalises it with
  `Emails.normalize` before it reaches `subscription`, whose foreign key points
  at `allowed_users(email)`; an un-normalised value would be a foreign key
  violation rather than a missing row. See `DECISIONS.md` entry 16.
- **Errors are `ResponseStatusException`**, raised by the service so the
  controller stays a thin adapter: 400 for an unusable URL or a document that is
  not a feed, 502 when the upstream is unreachable or answers 5xx, 404 for an
  unknown podcast, 403 when the caller does not follow the podcast whose
  episodes they asked for, 401 when the session carries no usable e-mail.
- **Method security is inert.** `PodcastController` carries the class-level
  `@PreAuthorize("isAuthenticated()")` that `DECISIONS.md` entry 15 requires, but
  `@EnableMethodSecurity` is not enabled anywhere in the backend, so that
  annotation currently does nothing and the coarse `/api/**` rule in
  `SecurityConfig` is what rejects anonymous calls.
- **Reading a feed sits outside the database's critical path.** The fetch is the
  first thing `subscribe` and `refresh` do, before any repository call, so a
  slow feed host cannot pin one of the pool's three connections for ten seconds.
