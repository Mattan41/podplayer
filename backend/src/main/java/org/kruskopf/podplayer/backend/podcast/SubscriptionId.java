package org.kruskopf.podplayer.backend.podcast;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Composite primary key of {@link Subscription}: the user who follows a
 * podcast, plus the podcast itself.
 *
 * <p>The user side is the e-mail address, not a numeric id, because this
 * backend has no user table of its own. Identity comes from the Supabase JWT
 * {@code email} claim and is resolved against {@code allowed_users}, created
 * by {@code V1__create_allowed_users.sql}; {@code subscription} and
 * {@code playback_state} therefore reference {@code allowed_users(email)}.
 * See {@code DECISIONS.md} entry 16.</p>
 *
 * <p>An {@code @Embeddable} key must be {@link Serializable} and implement
 * {@link Object#equals(Object)} and {@link Object#hashCode()}, because
 * Hibernate uses a key instance as the identity of the surrounding entity
 * within a persistence context.</p>
 */
@Embeddable
public class SubscriptionId implements Serializable {

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "podcast_id", nullable = false)
    private Long podcastId;

    /**
     * Required by JPA, which instantiates the key reflectively when
     * materialising a row.
     */
    public SubscriptionId() {
    }

    public SubscriptionId(String userEmail, Long podcastId) {
        this.userEmail = userEmail;
        this.podcastId = podcastId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public Long getPodcastId() {
        return podcastId;
    }

    public void setPodcastId(Long podcastId) {
        this.podcastId = podcastId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof SubscriptionId that)) {
            return false;
        }
        return Objects.equals(userEmail, that.userEmail)
                && Objects.equals(podcastId, that.podcastId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userEmail, podcastId);
    }
}
