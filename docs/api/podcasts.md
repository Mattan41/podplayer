# API — Podcasts

Base path `/api/podcasts`. Implemented by `PodcastController`, which delegates
to `PodcastService`.

## Authentication

Every endpoint requires an authenticated caller. The JWT issued by Supabase Auth
must carry an `email` claim that is present, unexpired and allowlisted in
`allowed_users`; `SecurityConfig` verifies the signature and the allowlist, and
rejects anything else before the request reaches this controller.

The caller's identity **is** that e-mail address. There is no numeric user id in
this API: `subscription` and `playback_state` are keyed on
`allowed_users(email)`, and `PodcastService` normalises the claim (trim and lower
case) before using it. See `DECISIONS.md` entries 15 and 16.

Authorization is declared at class level with
`@PreAuthorize("isAuthenticated()")`. As of Phase B `@EnableMethodSecurity` is not
enabled anywhere in the backend, so that annotation is not what currently
enforces the rule &mdash; the coarse `/api/**` &rarr; `authenticated()` rule in
`SecurityConfig` is. Nothing is exposed by the gap; it matters when a controller
first needs a role-based rule of its own.

## Conventions

- Every response is JSON. A successful write returns the created or updated
  object; there are no `204` responses in this family.
- Errors use Spring's default problem body (`ProblemDetail`: `type`, `title`,
  `status`, `detail`, `instance`), raised with `ResponseStatusException`. There
  is no bespoke error format, and the `detail` field carries the reason a feed
  could not be read so a client can display it verbatim.
- Timestamps are ISO-8601 instants in UTC (`TIMESTAMPTZ` in PostgreSQL,
  `java.time.Instant` in Java).
- URLs are returned exactly as the feed supplied them; nothing is rewritten or
  normalised.
- Bodies sent to these endpoints are the same DTOs returned by them, mapped from
  the JPA entities by a static `from(...)` factory. Entities are never serialised.

---

## POST /api/podcasts — subscribe

Fetches a feed, stores it as a podcast if it is new, imports every episode that
is not stored yet, and subscribes the caller to it.

**Request body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `feedUrl` | string | yes | Absolute `http` or `https` URL of an RSS 2.0, RSS 1.0 or Atom feed |

```json
{ "feedUrl": "https://example.org/test-podcast/feed.xml" }
```

**Responses**

| Status | When | Body |
| --- | --- | --- |
| `201` | The caller was not subscribed before | `SubscribeResult` |
| `200` | The caller was already subscribed; the feed was still read, so the podcast and its episodes may have been updated | `SubscribeResult` with `alreadySubscribed: true` |
| `400` | `feedUrl` is missing, blank, malformed, not `http`/`https`; the URL responded with a 4xx; or the response is not a readable RSS or Atom document (including a document carrying a DOCTYPE) | problem body |
| `401` | The session has no usable e-mail claim. Not reachable through the normal login flow | problem body |
| `502` | The feed host could not be reached, the request timed out, or the host answered with a 5xx | problem body |

```json
{
  "podcast": {
    "id": 1,
    "title": "Test Podcast",
    "author": "Test Author",
    "imageUrl": "https://example.org/podcast-artwork.png",
    "feedUrl": "https://example.org/test-podcast/feed.xml",
    "lastFetchedAt": "2026-09-29T18:04:00Z",
    "episodeCount": 3
  },
  "alreadySubscribed": false
}
```

**Notes**

- Idempotent by feed URL: `podcast.feed_url` is unique, so two users subscribing
  to the same feed share one `podcast` row and one set of episodes. Only the
  `subscription` row is per user.
- Episodes are deduplicated on `(podcast_id, guid)`. The guid comes from the
  feed, falling back to the enclosure URL when the feed omits or blanks it.
- Subscribe is also a refresh: the feed is read on every call, so a re-subscribe
  picks up new episodes.
- `422` is deliberately not used. A feed that parses but yields no usable
  episodes still returns `201` with `episodeCount: 0`, because a valid feed with
  no items yet &mdash; a brand-new podcast &mdash; is a legitimate subscription,
  not a client error.
- Two concurrent subscribes to the same new feed race on the unique `feed_url`;
  one of them can fail rather than being retried.

---

## GET /api/podcasts — list subscriptions

Lists the podcasts the caller follows.

**Responses**

| Status | When | Body |
| --- | --- | --- |
| `200` | Always, once authenticated | Array of `PodcastSummaryDto`, empty when the caller follows nothing |
| `401` | The session has no usable e-mail claim | problem body |

```json
[
  {
    "podcastId": 1,
    "title": "Test Podcast",
    "author": "Test Author",
    "imageUrl": "https://example.org/podcast-artwork.png",
    "feedUrl": "https://example.org/test-podcast/feed.xml",
    "lastFetchedAt": "2026-09-29T18:04:00Z",
    "subscribedAt": "2026-09-29T18:05:12Z",
    "episodeCount": 3
  }
]
```

**Notes**

- Ordered by `title`, case-insensitively, with any untitled podcast last. The
  order is applied in the service, not in SQL.
- `episodeCount` costs one `COUNT` query per subscription. Acceptable for the
  tens of podcasts a listener has; it should become a single grouped query if
  the list grows.
- `lastFetchedAt` is `null` for a podcast that has never been read successfully;
  `subscribedAt` is never `null`.

---

## GET /api/podcasts/{id}/episodes — list episodes

Lists one podcast's episodes, newest first, for a caller who follows it.

**Path parameters**

| Name | Type | Notes |
| --- | --- | --- |
| `id` | integer | The `podcastId` from the subscription list |

**Responses**

| Status | When | Body |
| --- | --- | --- |
| `200` | The caller follows the podcast | Array of `EpisodeDto`, empty for a podcast with no stored episodes |
| `400` | `id` is not an integer | problem body |
| `401` | The session has no usable e-mail claim | problem body |
| `403` | The podcast exists but the caller does not follow it | problem body |
| `404` | No podcast has that id | problem body |

```json
[
  {
    "id": 7,
    "guid": "episode-1",
    "title": "Episode One",
    "description": "The first episode.",
    "audioUrl": "https://example.org/audio/episode-1.mp3",
    "publishedAt": "2026-01-05T09:00:00Z",
    "durationSeconds": 3723,
    "imageUrl": "https://example.org/episode-1-artwork.png"
  }
]
```

**Notes**

- Ordered by `published_at` descending. PostgreSQL sorts nulls first in `DESC`
  order, so an episode whose feed omitted a publish date appears at the top of
  the list rather than the bottom. Worth revisiting if it looks wrong in the UI.
- Subscription is checked before any episode is read, so the endpoint cannot be
  used to enumerate the catalogue of a podcast the caller does not follow.
- The `403`/`404` split tells an allowlisted caller whether a podcast id exists.
  Accepted: ids are small integers, and the podcast catalogue is shared, not
  per-user.
- `durationSeconds` and `publishedAt` are `null` when the feed did not supply
  them; `imageUrl` is `null` when it carried no `itunes:image`.
- A `403` is also what a caller gets for a podcast that someone else subscribed
  to: subscriptions are per user, the podcasts themselves are not.

---

## POST /api/podcasts/{id}/refresh — refresh a feed

Re-reads the podcast's feed and imports whatever it has that is not stored yet.

**Path parameters**

| Name | Type | Notes |
| --- | --- | --- |
| `id` | integer | The `podcastId` to refresh |

**Responses**

| Status | When | Body |
| --- | --- | --- |
| `200` | The feed was read | `RefreshResult`; `addedEpisodes` is `0` in the normal steady state |
| `400` | The stored feed URL is unusable, the response is not a feed, or the upstream answered 4xx | problem body |
| `401` | The session has no usable e-mail claim | problem body |
| `404` | No podcast has that id | problem body |
| `502` | The feed host could not be reached, the request timed out, or it answered 5xx | problem body |

```json
{
  "podcast": {
    "id": 1,
    "title": "Test Podcast",
    "author": "Test Author",
    "imageUrl": "https://example.org/podcast-artwork.png",
    "feedUrl": "https://example.org/test-podcast/feed.xml",
    "lastFetchedAt": "2026-09-29T18:20:41Z",
    "episodeCount": 5
  },
  "addedEpisodes": 2
}
```

**Notes**

- **The subscription is not checked.** Any authenticated caller may refresh any
  podcast, which is deliberate for this phase: the catalogue is shared, and
  refreshing only ever adds public feed data. If refreshing ever needs to be
  rationed or attributed, this is the place to add a subscription or role check.
- Metadata is overwritten only where the feed supplies a value, so a feed that
  momentarily omits its artwork or summary cannot erase what is stored.
  `lastFetchedAt` is written on every successful refresh, and is what the
  subscription list shows.
- A failed refresh leaves the stored podcast and episodes untouched: the fetch
  happens before the first write, and the transaction rolls back.
- `addedEpisodes` counts only rows inserted by this call, so a second refresh
  with nothing new returns `0` rather than an error.