package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * A user's follow of a podcast.
 *
 * <p>The mapping mirrors the {@code subscription} table created by
 * {@code V2__create_podcast_tables.sql}.</p>
 *
 * <p><strong>Why an entity with an {@code @EmbeddedId} rather than a
 * {@code @ManyToMany}?</strong> A pure {@code @ManyToMany} join table carries
 * only the two foreign keys, and JPA gives no place to store anything else
 * about the relationship. {@code subscribed_at} is data about the
 * relationship itself, not about either endpoint, so it has to live somewhere.
 * The alternatives were a {@code @ManyToMany} plus an {@code @ElementCollection}
 * of timestamps, or an entity modelling the join table directly. The join table
 * is the concept here &mdash; "this user follows this podcast since this
 * date" &mdash; so it is modelled as an entity with a composite key, which also
 * makes it addressable by a repository and lets Phase B write it with ordinary
 * {@code save}/{@code delete} calls. The cost is a surrogate {@code @Id} is
 * absent, so a subscription cannot be referenced by a single-column key; no
 * such reference is needed.</p>
 *
 * <p>Every timestamp column is {@code TIMESTAMPTZ} in PostgreSQL and is
 * therefore represented as an {@link Instant}.</p>
 */
@Entity
@Table(name = "subscription")
public class Subscription {

    @EmbeddedId
    private SubscriptionId id;

    /**
     * Set once, when the subscription is created; the column is also
     * {@code DEFAULT now()} in the database.
     */
    @Column(name = "subscribed_at", nullable = false, updatable = false)
    private Instant subscribedAt = Instant.now();

    public Subscription() {
    }

    public Subscription(SubscriptionId id) {
        this.id = id;
    }

    public SubscriptionId getId() {
        return id;
    }

    public void setId(SubscriptionId id) {
        this.id = id;
    }

    public Instant getSubscribedAt() {
        return subscribedAt;
    }

    public void setSubscribedAt(Instant subscribedAt) {
        this.subscribedAt = subscribedAt;
    }
}
