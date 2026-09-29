# Phase A — Domain model

Persistence model for podcasts, episodes, subscriptions and playback state.
No ingestion, no RSS parsing, no frontend.

## Deliverables

- `V2__create_podcast_tables.sql` — four tables: podcast, episode,
  subscription, playback_state.
- Entities: `Podcast`, `Episode`, `Subscription` (with `SubscriptionId`),
  `PlaybackState` (with `PlaybackStateId`) in package
  `org.kruskopf.podplayer.backend.podcast`.
- Repositories for each entity, with the query methods Phase B and D will
  need.

## Acceptance criteria

- `./mvnw compile` exits 0.
- `./mvnw test` exits 0. The existing `BackendApplicationTests` loads the
  Spring context, and with `ddl-auto: validate` Hibernate compares every
  entity against the live schema.
- No service, controller, DTO or test is added.
- No dependency is added to `pom.xml`.

## Out of scope

- RSS or Atom parsing.
- Endpoints.
- Frontend.
- `@PreAuthorize` on new classes; that arrives with the controllers in
  Phase B.

## Notes

- `subscription` and `playback_state` have composite primary keys and a
  timestamp column, so they are modelled as entities with an `@EmbeddedId`
  rather than `@ManyToMany`. The join table is the entity.
- The user side of both composite keys is `user_email`, referencing
  `allowed_users(email)`. There is no `users` table: identity is the JWT
  e-mail address. See `DECISIONS.md` entry 16.
- Every timestamp is `java.time.Instant` and every column is
  `TIMESTAMPTZ`, matching the V1 migration.
- `episode.podcast_id` is a plain column rather than a `@ManyToOne`
  association; callers work with identifiers and the database already
  enforces the foreign key.