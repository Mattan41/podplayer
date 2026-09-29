package org.kruskopf.podplayer.backend.podcast;

/**
 * Result of a refresh request.
 *
 * @param podcast       the podcast after the refresh, with its current episode
 *                      count and a freshly written {@code lastFetchedAt}
 * @param addedEpisodes how many episodes the refresh added. Zero means the feed
 *                      had nothing new, which is the normal case and not a
 *                      failure
 */
public record RefreshResult(
        PodcastDto podcast,
        int addedEpisodes) {
}
