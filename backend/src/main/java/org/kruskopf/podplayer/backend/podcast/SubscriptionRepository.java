package org.kruskopf.podplayer.backend.podcast;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence access for {@link Subscription}.
 *
 * <p>A user is identified by e-mail address rather than by a numeric id. That
 * column lives in the {@link SubscriptionId} embedded key, and Spring Data does
 * not resolve a bare {@code userEmail} against the id: a derived query must
 * name the path explicitly, hence {@code findByIdUserEmail}. This was measured,
 * not assumed &mdash; {@code findByUserEmail} fails context startup with
 * "No property 'userEmail' found for type 'Subscription'".</p>
 */
public interface SubscriptionRepository extends JpaRepository<Subscription, SubscriptionId> {

    /**
     * @param userEmail the subscriber's e-mail address
     * @return the user's subscriptions, unordered
     */
    List<Subscription> findByIdUserEmail(String userEmail);

    /**
     * @param userEmail the subscriber's e-mail address
     * @param podcastId the podcast to check
     * @return {@code true} if the user already follows that podcast
     */
    boolean existsByIdUserEmailAndIdPodcastId(String userEmail, Long podcastId);
}
