package org.kruskopf.podplayer.backend.podcast;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Persistence access for {@link Episode}.
 */
public interface EpisodeRepository extends JpaRepository<Episode, Long> {

    /**
     * @param podcastId the owning podcast
     * @return the podcast's episodes, newest first
     */
    @Query("SELECT e FROM Episode e WHERE e.podcastId = :podcastId " +
            "ORDER BY e.publishedAt DESC NULLS LAST")
    List<Episode> findByPodcastIdOrderByPublishedAtDesc(@Param("podcastId") Long podcastId);

    /**
     * Looks an episode up by the identifier the feed assigns it. A
     * {@code guid} is unique only within its own feed, so the podcast must be
     * part of the lookup.
     *
     * @param podcastId the owning podcast
     * @param guid      the feed's identifier for the episode
     * @return the episode with that guid in that podcast, if it is stored
     */
    Optional<Episode> findByPodcastIdAndGuid(Long podcastId, String guid);

    /**
     * @param podcastId the owning podcast
     * @return how many episodes of that podcast are stored
     */
    long countByPodcastId(Long podcastId);
}
