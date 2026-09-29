-- =============================================================================
-- V2__create_podcast_tables.sql
--
-- Creates the persistence model for podcasts, episodes, subscriptions and
-- playback state. No row is seeded: podcasts and episodes arrive with feed
-- ingestion in Phase B.
--
-- Four tables are created, in dependency order:
--   podcast         the feed itself, identified by its feed URL
--   episode         one row per feed item, unique per (podcast_id, guid)
--   subscription    which user follows which podcast
--   playback_state  where a user left off in an episode
--
-- NOTE ON USER IDENTITY:
--   There is no "users" table. Identity is the e-mail address in
--   allowed_users (created by V1), which the backend reads from the JWT
--   "email" claim. subscription and playback_state therefore reference
--   allowed_users(email) rather than a numeric user id. See DECISIONS.md
--   entry 16.
--
-- NOTE ON CASCADES:
--   Deleting a podcast deletes its episodes, deleting an episode deletes its
--   playback state, and deleting an allowlist entry deletes that user's
--   subscriptions and playback state.
--
-- NOTE ON INDEXES:
--   Only two indexes are added, one per query that needs it:
--   episode(podcast_id) for the episode list, and playback_state(user_email)
--   for "continue listening". The composite primary keys already cover
--   lookups by user on subscription and by (user, episode) on playback_state.
-- =============================================================================

CREATE TABLE podcast (
    id               BIGSERIAL PRIMARY KEY,
    feed_url         TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    description      TEXT,
    author           TEXT,
    image_url        TEXT,
    last_fetched_at  TIMESTAMPTZ
);

CREATE TABLE episode (
    id                BIGSERIAL PRIMARY KEY,
    podcast_id        BIGINT NOT NULL REFERENCES podcast(id) ON DELETE CASCADE,
    guid              TEXT NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    audio_url         TEXT NOT NULL,
    published_at      TIMESTAMPTZ,
    duration_seconds  INT,
    image_url         TEXT,
    CONSTRAINT episode_duration_seconds_check
        CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT episode_podcast_id_guid_key UNIQUE (podcast_id, guid)
);

CREATE INDEX episode_podcast_id_idx ON episode (podcast_id);

CREATE TABLE subscription (
    user_email     TEXT NOT NULL REFERENCES allowed_users(email) ON DELETE CASCADE,
    podcast_id     BIGINT NOT NULL REFERENCES podcast(id) ON DELETE CASCADE,
    subscribed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_email, podcast_id)
);

CREATE TABLE playback_state (
    user_email        TEXT NOT NULL REFERENCES allowed_users(email) ON DELETE CASCADE,
    episode_id        BIGINT NOT NULL REFERENCES episode(id) ON DELETE CASCADE,
    position_seconds  INT NOT NULL DEFAULT 0,
    played_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed         BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT playback_state_position_seconds_check CHECK (position_seconds >= 0),
    PRIMARY KEY (user_email, episode_id)
);

CREATE INDEX playback_state_user_email_idx ON playback_state (user_email);
