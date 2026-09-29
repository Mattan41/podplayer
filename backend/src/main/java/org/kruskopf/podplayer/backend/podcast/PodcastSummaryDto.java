package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

/**
 * Read model of one entry in the current user's subscription list.
 *
 * <p>It maps two entities at once, because a subscription row carries only the
 * two ids and its own timestamp: everything a list needs to display lives on
 * the podcast. {@code subscribedAt} is kept because the list is a record of
 * follows, and a client may want to order or annotate by it.</p>
 *
 * @param podcastId     the podcast's surrogate key
 * @param title         the feed title
 * @param author        the feed author, or {@code null}
 * @param imageUrl      the feed artwork URL, or {@code null}
 * @param feedUrl       the feed URL this subscription points at
 * @param lastFetchedAt when the feed was last read, or {@code null} if it has
 *                      never been read successfully
 * @param subscribedAt  when the user subscribed
 * @param episodeCount  how many episodes of this podcast are stored
 */
public record PodcastSummaryDto(
        Long podcastId,
        String title,
        String author,
        String imageUrl,
        String feedUrl,
        Instant lastFetchedAt,
        Instant subscribedAt,
        long episodeCount) {

    /**
     * Maps a subscription and the podcast it points at onto one read model.
     *
     * @param subscription the subscription row being listed
     * @param podcast      the podcast that row points at
     * @param episodeCount how many episodes of that podcast are stored
     * @return the equivalent DTO
     */
    public static PodcastSummaryDto from(Subscription subscription, Podcast podcast, long episodeCount) {
        return new PodcastSummaryDto(
                podcast.getId(),
                podcast.getTitle(),
                podcast.getAuthor(),
                podcast.getImageUrl(),
                podcast.getFeedUrl(),
                podcast.getLastFetchedAt(),
                subscription.getSubscribedAt(),
                episodeCount);
    }
}
