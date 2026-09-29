package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

/**
 * Read model of a podcast, returned when a subscription is created and when a
 * feed is refreshed.
 *
 * <p>It carries an episode count because both callers want it: the subscribe
 * response says how many episodes were imported, and the refresh response says
 * how many the feed holds now.</p>
 *
 * @param id             the podcast's surrogate key, used by the client in all
 *                       later calls
 * @param title          the feed title
 * @param author         the feed author, or {@code null} when the feed omits it
 * @param imageUrl       the feed artwork URL, or {@code null}
 * @param feedUrl        the feed URL the podcast was subscribed to
 * @param lastFetchedAt  when the feed was last read, or {@code null} if it has
 *                       never been read successfully
 * @param episodeCount   how many episodes of this podcast are stored
 */
public record PodcastDto(
        Long id,
        String title,
        String author,
        String imageUrl,
        String feedUrl,
        Instant lastFetchedAt,
        long episodeCount) {

    /**
     * Maps a persisted podcast, plus its episode count, onto the read model.
     *
     * @param podcast      the entity to map
     * @param episodeCount how many episodes of that podcast are stored
     * @return the equivalent DTO
     */
    public static PodcastDto from(Podcast podcast, long episodeCount) {
        return new PodcastDto(
                podcast.getId(),
                podcast.getTitle(),
                podcast.getAuthor(),
                podcast.getImageUrl(),
                podcast.getFeedUrl(),
                podcast.getLastFetchedAt(),
                episodeCount);
    }
}
