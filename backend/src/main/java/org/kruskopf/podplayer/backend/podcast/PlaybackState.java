package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Where a user left off in an episode.
 *
 * <p>The mapping mirrors the {@code playback_state} table created by
 * {@code V2__create_podcast_tables.sql}. There is one row per user and
 * episode, overwritten as playback advances, which is what makes cross-device
 * resume possible: the position is stored server-side rather than in the
 * browser.</p>
 *
 * <p><strong>Why an entity with an {@code @EmbeddedId} rather than a
 * {@code @ManyToMany}?</strong> The same reason as {@link Subscription}. The
 * row is not an association between a user and an episode but a record with
 * its own state &mdash; {@code played_at}, {@code position_seconds} and
 * {@code completed} &mdash; and a {@code @ManyToMany} join table has nowhere
 * to put that state. Modelling the join table as an entity keeps the mapping
 * column-for-column with the migration, and gives Phase E a repository to
 * write progress through.</p>
 *
 * <p>Every timestamp column is {@code TIMESTAMPTZ} in PostgreSQL and is
 * therefore represented as an {@link Instant}.</p>
 */
@Entity
@Table(name = "playback_state")
public class PlaybackState {

    @EmbeddedId
    private PlaybackStateId id;

    /**
     * Playhead position in seconds. The column is {@code NOT NULL DEFAULT 0}
     * in the database.
     */
    @Column(name = "position_seconds", nullable = false)
    private int positionSeconds;

    /**
     * Timestamp of the most recent progress write. Unlike the other
     * timestamps in this package it is updated on every save, so it is not
     * marked {@code updatable = false}.
     */
    @Column(name = "played_at", nullable = false)
    private Instant playedAt = Instant.now();

    /**
     * {@code true} once the episode has been listened through, which lets the
     * listener distinguish "finished" from "started but abandoned at the
     * end".
     */
    @Column(nullable = false)
    private boolean completed;

    public PlaybackState() {
    }

    public PlaybackState(PlaybackStateId id) {
        this.id = id;
    }

    public PlaybackStateId getId() {
        return id;
    }

    public void setId(PlaybackStateId id) {
        this.id = id;
    }

    public int getPositionSeconds() {
        return positionSeconds;
    }

    public void setPositionSeconds(int positionSeconds) {
        this.positionSeconds = positionSeconds;
    }

    public Instant getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(Instant playedAt) {
        this.playedAt = playedAt;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
