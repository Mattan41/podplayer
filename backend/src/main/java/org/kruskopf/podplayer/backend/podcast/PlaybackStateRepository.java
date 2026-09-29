package org.kruskopf.podplayer.backend.podcast;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence access for {@link PlaybackState}.
 *
 * <p>A user is identified by e-mail address rather than by a numeric id. That
 * column lives in the {@link PlaybackStateId} embedded key, and Spring Data does
 * not resolve a bare {@code userEmail} against the id: a derived query must
 * name the path explicitly, hence {@code findByIdUserEmail}. See
 * {@link SubscriptionRepository} for the measurement that established this.</p>
 */
public interface PlaybackStateRepository extends JpaRepository<PlaybackState, PlaybackStateId> {

    /**
     * @param userEmail the listener's e-mail address
     * @param episodeId the episode to look up
     * @return the listener's progress in that episode, if any
     */
    Optional<PlaybackState> findByIdUserEmailAndIdEpisodeId(String userEmail, Long episodeId);

    /**
     * @param userEmail the listener's e-mail address
     * @return the listener's progress rows, most recently played first
     */
    List<PlaybackState> findByIdUserEmailOrderByPlayedAtDesc(String userEmail);
}
