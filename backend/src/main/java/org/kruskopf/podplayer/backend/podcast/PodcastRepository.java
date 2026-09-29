package org.kruskopf.podplayer.backend.podcast;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence access for {@link Podcast}.
 */
public interface PodcastRepository extends JpaRepository<Podcast, Long> {

    /**
     * @param feedUrl the feed URL to look up
     * @return the podcast with that feed URL, if it has been fetched before
     */
    Optional<Podcast> findByFeedUrl(String feedUrl);

    /**
     * @return every known podcast, ordered by title for the subscription list
     */
    List<Podcast> findAllByOrderByTitleAsc();
}
