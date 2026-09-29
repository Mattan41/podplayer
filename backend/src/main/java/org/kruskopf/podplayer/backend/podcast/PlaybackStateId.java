package org.kruskopf.podplayer.backend.podcast;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Composite primary key of {@link PlaybackState}: the user who listened, plus
 * the episode they listened to.
 *
 * <p>The user side is the e-mail address, not a numeric id, because this
 * backend has no user table of its own. Identity comes from the Supabase JWT
 * {@code email} claim and is resolved against {@code allowed_users}, created
 * by {@code V1__create_allowed_users.sql}; see {@code DECISIONS.md} entry
 * 16.</p>
 *
 * <p>An {@code @Embeddable} key must be {@link Serializable} and implement
 * {@link Object#equals(Object)} and {@link Object#hashCode()}, because
 * Hibernate uses a key instance as the identity of the surrounding entity
 * within a persistence context.</p>
 */
@Embeddable
public class PlaybackStateId implements Serializable {

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "episode_id", nullable = false)
    private Long episodeId;

    /**
     * Required by JPA, which instantiates the key reflectively when
     * materialising a row.
     */
    public PlaybackStateId() {
    }

    public PlaybackStateId(String userEmail, Long episodeId) {
        this.userEmail = userEmail;
        this.episodeId = episodeId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public Long getEpisodeId() {
        return episodeId;
    }

    public void setEpisodeId(Long episodeId) {
        this.episodeId = episodeId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof PlaybackStateId that)) {
            return false;
        }
        return Objects.equals(userEmail, that.userEmail)
                && Objects.equals(episodeId, that.episodeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userEmail, episodeId);
    }
}
