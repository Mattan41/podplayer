# API — Playback state

Base path `/api/playback`. Implemented by `PlaybackStateController`, which
delegates to `PodcastService`.

The resource is **the caller's state for an episode**, not the episode. A
`GET /api/playback/{episodeId}` therefore reads as "this user's playback of this
episode". The path is deliberately not `/api/episodes/{id}/playback`, because no
single-episode endpoint otherwise exists to nest under; see
`docs/roadmap/playback-state.md`.

## Authentication

Every endpoint requires an authenticated caller. The JWT issued by Supabase Auth
must carry an `email` claim that is present, unexpired and allowlisted in
`allowed_users`; `SecurityConfig` verifies the signature and the allowlist, and
rejects anything else before the request reaches this controller.

The caller's identity **is** that e-mail address. There is no numeric user id in
this API: `playback_state` is keyed on `allowed_users(email)` through
`user_email TEXT NOT NULL REFERENCES allowed_users(email) ON DELETE CASCADE`, and
`PodcastService` normalises the claim (trim and lower case) before every read and
write. An un-normalised write would be a foreign key violation rather than a
missing row, which is why normalisation happens in one place. See
`DECISIONS.md` entry 16.

Authorization is declared at class level with
`@PreAuthorize("isAuthenticated()")`, per `DECISIONS.md` entry 15.

## Conventions

- Every response is JSON. A successful write returns the stored object; there
  are no `204` responses in this family.
- Errors use Spring's default problem body (`ProblemDetail`: `type`, `title`,
  `status`, `detail`, `instance`), raised with `ResponseStatusException`. There
  is no bespoke error format.
- Timestamps are ISO-8601 instants in UTC (`TIMESTAMPTZ` in PostgreSQL,
  `java.time.Instant` in Java).
- Bodies sent to these endpoints are DTOs, and every response is a DTO mapped
  from the JPA entity by a static `from(...)` factory. Entities are never
  serialised.
- The response echoes `episodeId`, which is also the path parameter. It does
  **not** echo the user's e-mail; that is the caller and is not part of the
  representation.

---

## GET /api/playback/{episodeId} — read the stored position

Returns the caller's stored position for one episode.

**Path parameters**

| Name | Type | Notes |
| --- | --- | --- |
| `episodeId` | integer | The `id` of the episode from the episode list |

**Responses**

| Status | When | Body |
| --- | --- | --- |
| `200` | A position is stored for the caller and that episode | `PlaybackStateDto` |
| `401` | The session has no usable e-mail claim. Not reachable through the normal login flow | problem body |
| `404` | Nothing is stored yet, so the episode has not been started. This is the normal state for an unplayed episode, not a failure | problem body |

```json
{
  "episodeId": 7,
  "positionSeconds": 1170,
  "playedAt": "2026-10-05T19:31:07Z",
  "completed": false
}
```

**Notes**

- **A `404` means "start at 0".** It is the expected answer for an episode the
  caller has not played, and it is why `playedAt` is never `null`: a `200` always
  has a timestamp because it corresponds to a real row. A client turns the `404`
  into "no stored position" rather than surfacing an error.
- An `episodeId` that does not exist returns the same `404` as an episode with
  no state; the endpoint does not distinguish the two, and a client has no reason
  to.

---

## PUT /api/playback/{episodeId} — store the position

Stores the caller's position in one episode, creating the row on the first write.
The body is a full replacement, not a partial update.

**Path parameters**

| Name | Type | Notes |
| --- | --- | --- |
| `episodeId` | integer | The episode being reported on; must exist |

**Request body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `positionSeconds` | integer | yes | Playhead position from the start; must not be negative. A missing value deserialises to `0`, which is a valid "start" position |
| `completed` | boolean | yes | Whether playback reached the end. A missing value deserialises to `false` |

```json
{ "positionSeconds": 1170, "completed": false }
```

**Responses**

| Status | When | Body |
| --- | --- | --- |
| `200` | Always, once authenticated and the input is valid. The row was created if it did not exist, and overwritten if it did | `PlaybackStateDto`, the state after the write |
| `400` | `positionSeconds` is negative | problem body |
| `401` | The session has no usable e-mail claim | problem body |
| `404` | No episode has that id | problem body |

```json
{
  "episodeId": 7,
  "positionSeconds": 1170,
  "playedAt": "2026-10-05T19:31:07Z",
  "completed": false
}
```

**Notes**

- **`PUT` is an upsert, and it is idempotent.** The row is created on the first
  write and overwritten on every later one. A repeated `PUT` with the same body
  produces the same stored state, apart from `playedAt`, which records the time
  of the most recent write.
- **`playedAt` is a last-write marker, not a first-seen one.** Every `PUT`
  refreshes it to now, whether it created or updated the row. There is no
  `created_at` column; `playback_state` has no insert-only state field.
- **Last write wins.** If two devices write the same episode, the later `PUT` is
  the stored state. There is no merge, no version check and no live sync; see the
  conflict note below.
- **The server stores a number; it does not apply the resume rule.** `GET` and
  `PUT` neither round a position nor clamp it to a "near the end" threshold. The
  decision of where to start playback, including ignoring a `completed` episode,
  belongs to the client.
- `completed` means **playback reached the end of the episode**, and nothing
  else. In this phase there is no "mark as played" or "mark as unplayed" action;
  a future one would need somewhere else to record it, because this single column
  cannot tell the two events apart.
- There is no `DELETE`. A user cannot clear their progress in this phase;
  clearing a position is mark-as-unplayed, which is out of scope.

---

## Notes for a future client

These are concerns the server deliberately does not have, stated here so a
client implementer knows what the backend does and does not do. The full
reasoning lives in `docs/roadmap/playback-state.md` and, once the client lands,
`docs/DECISIONS.md`.

- **Writes are debounced on the client.** `timeupdate` fires roughly four times
  per second; writing on every tick would be four database writes per second per
  listener. The client is expected to write on pause, on `beforeunload` and
  `pagehide`, on episode change, and otherwise at most every 30 seconds. The
  server accepts whatever it is sent and has no rate limit of its own.
- **The resume rule is a client rule.** On restoring an episode: if `completed`
  is `true`, start at 0; otherwise start at the stored `positionSeconds`,
  exactly. There is intentionally no "within N seconds of the end, start over"
  tail. The server stores the position verbatim and applies no such rule.
- **Conflicts resolve last-write-wins.** This is single-user personal software;
  the realistic conflict ("phone paused at 10:00, laptop paused at 10:05") has a
  defensible answer without a CRDT or operational transform. Live cross-device
  sync is out of scope.
- **A failed write is lost.** There is no offline queue. When a `PUT` does not
  reach the server, the next successful `PUT` writes the then-current position.
