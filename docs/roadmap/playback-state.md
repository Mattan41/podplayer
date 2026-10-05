# Phase E — Playback state

Save playback position to the backend and restore it on the next visit,
including on a different device. No history view, no mark-as-played UI, no
"continue listening" on the landing page — those are later.

**Status: not started.**

## Deliverables

Backend:

- `PlaybackStateRepository` is used as-is; Phase E adds no method to it. The
  phase covers the work with two operations: read an existing row through the
  already-present `findByIdUserEmailAndIdEpisodeId`, and write through the
  inherited `JpaRepository.save()`, in a read-then-mutate upsert. Phase E adds
  nothing to the schema either: `V2__create_podcast_tables.sql` already carries
  `playback_state` with `position_seconds`, `played_at` and `completed`.
- `PlaybackStateController` (or methods on `PodcastController`) with
  `GET /api/playback/{episodeId}` and `PUT /api/playback/{episodeId}`.
  Both require an authenticated caller, both key on the JWT `email` claim
  normalised through `Emails.normalize`, per `DECISIONS.md` entry 16.
- DTOs `PlaybackStateDto` (read) and `PlaybackStateUpdateRequest` (write).
  No entity crosses the HTTP boundary.
- `docs/api/playback.md`, matching the shape of `docs/api/podcasts.md`.

Frontend:

- `frontend/lib/api/playback.ts` — `getPosition(episodeId)` and
  `savePosition(episodeId, positionSeconds, completed)`, using the existing
  `apiFetch`. Types mirror the backend DTOs field for field
  (ARCHITECTURE.md §5 rule 8).
- `PodcastSource` gains the two operations, or a second source interface is
  introduced. Decide which before writing the interface; the current one is
  named `PodcastSource` and playback state is not a podcast operation.
- `PlayerProvider` writes position on the events listed below, and reads it
  when `playEpisode` is called.
- `frontend/lib/podcast-cache.ts` — `POSITIONS_CACHE_KEY` exists and is unused;
  this phase either uses it or removes it. See the notes.

Docs:

- `docs/DECISIONS.md` entries for: the debounce interval, the resume rule,
  what `completed` means, and cross-device conflict resolution.
- `docs/api/playback.md`.
- `docs/ROADMAP.md` — mark Phase E in progress.

## Acceptance criteria

- `./mvnw test` and `npm run lint` / `npm run build` all exit 0.
- Play an episode to the 20-second mark on one browser, close the tab, reopen
  `/podcasts/view?id=N` in a second browser signed in as the same user, press
  play: playback starts at 20 seconds, not 0.
- Pressing pause triggers exactly one `PUT` to `/api/playback/{episodeId}`.
  Verified by watching the network tab, not by asserting the code path.
- Seeking while paused triggers one `PUT`, not a stream.
- An episode the user has not started returns no position and starts at 0.
- An episode the user has finished (`completed: true`) starts at 0, not at
  the end.
- An episode paused at 58:30 of a 60-minute recording resumes at 58:30, not
  at 0.
- Deleting an allowlist entry deletes that user's `playback_state` rows,
  through the existing cascade. Verified by `SELECT count(*) FROM
  playback_state WHERE user_email = '...'` before and after.

## Out of scope

- A history view of what has been listened to.
- "Continue listening" on the landing page. The page currently renders the
  subscription list; adding a top section is a separate change.
- Mark-as-played and mark-as-unplayed as user actions. The `completed` flag is
  set by playback reaching the end, not by a button.
- Live cross-device sync — one device noticing another's progress while both
  are playing. Last write wins.
- Playback speed, sleep timer. See `BACKLOG.md`.
- Offline position queueing. A `PUT` that fails is lost; the next successful
  one writes the current position.

## Notes

### The write is debounced, and the interval is a decision

`timeupdate` fires roughly four times per second. Writing on every tick is four
database writes per second per active listener. The provider writes on these
events instead:

- On pause.
- On `beforeunload` and on `pagehide`, so a closed tab keeps its place.
- On episode change, before the new episode loads.
- During playback, at most every 30 seconds.

Thirty is chosen because the cost of losing 30 seconds of position is small,
and the cost of a write every five seconds across the user base is not. It is
not a number derived from a benchmark; state it as a decision, not as a
measurement.

The 30-second write and the pause write go through the same code path. A pause
less than 30 seconds after the last write still writes, because a pause is an
explicit signal that the user is about to leave.

### The resume rule

When `playEpisode` is called and a stored position exists:

- If `completed` is `true`, start at 0.
- Otherwise start at the stored position, exactly.

There is deliberately no "if you are within N seconds of the end, start over"
tail. That convention exists in Spotify and Overcast because their primary use
case is music and short-form audio, where a few seconds of missed content at
the end does not matter. A podcast listener who pauses at 58:30 of a 60-minute
episode paused there on purpose; restarting them at 0 discards a decision they
made. The user is trusted to press play, hear the last 90 seconds, and have the
episode complete. If that turns out to be annoying, the tail is a one-line
change, and the cost of adding it later is smaller than the cost of removing it
from users who have come to rely on exact resume.

The rule lives in the frontend, not the backend. The backend stores a number;
the client decides what to do with it. State that in the decision entry, so
that a future API consumer is not surprised that the resume rule is not applied
server-side.

### The `completed` flag

`playback_state.completed` exists in the schema. In this phase it is set when
playback reaches the end of the episode (the `<audio>` element's `ended` event,
or `currentTime >= duration - 1`), and cleared when the user presses play on a
completed episode. It is not a user-visible "mark as played" — that is a later
feature and would need a separate column or a separate table, because a user
marking something played and playback reaching the end are different events
that this single column cannot distinguish.

Write that limitation down. It is the kind of thing that becomes a bug report
six months later.

### Cross-device conflicts: last write wins

If two devices play the same episode at the same time, the last `PUT` wins. A
CRDT or an operational transform is out of scope: this is single-user personal
software, and the realistic conflict is "phone paused at 10:00, laptop paused
at 10:05", where last-write-wins produces a defensible answer.

### `POSITIONS_CACHE_KEY` is unused

`frontend/lib/podcast-cache.ts` defines `POSITIONS_CACHE_KEY` and nothing reads
it. Two options: use it in this phase to paint the last-known position before
the fetch resolves (consistent with the read cache's stale-while-revalidate
shape, `DECISIONS.md` entry 22), or delete it. Using it is consistent with the
rest of the app; deleting it is one less thing to maintain. Decide, and record
the decision.

### The endpoint path is `/api/playback/{episodeId}`, not `/api/episodes/{id}/playback`

The resource being read or written is the user's state for an episode, not the
episode itself. `/api/playback/{episodeId}` reads as "this user's playback of
this episode", which is the thing. The alternative nests the resource under an
endpoint that does not otherwise exist for a single episode.