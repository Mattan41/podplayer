package org.kruskopf.podplayer.backend.podcast.feed;

import java.time.Instant;

/**
 * One episode as read from a feed, before anything is persisted.
 *
 * <p>A record rather than the JPA entity, so that {@link RssFeedParser} cannot
 * hand a detached entity to the service and the service cannot accidentally
 * persist a partially populated one. The fields mirror the columns of
 * {@code episode} that a feed can supply.</p>
 *
 * @param guid            the feed's identifier for the episode. Never blank:
 *                        when the feed omits it, the parser falls back to
 *                        {@code audioUrl}, which is the only other value in an
 *                        item that is stable across fetches
 * @param title           the episode title, never blank
 * @param description     the episode summary, or {@code null} when the item has
 *                        neither a description nor any content
 * @param audioUrl        the enclosure URL to play, never {@code null}. An item
 *                        without one is skipped by the parser, because an
 *                        episode that cannot be played is not worth a row
 * @param publishedAt     the publication timestamp, or {@code null} when the
 *                        feed omits it
 * @param durationSeconds the duration in seconds, or {@code null} when the
 *                        feed omits it or states it in a form the parser
 *                        cannot read
 * @param imageUrl        the episode artwork, or {@code null} when the feed
 *                        does not carry any
 */
public record ParsedEpisode(
        String guid,
        String title,
        String description,
        String audioUrl,
        Instant publishedAt,
        Integer durationSeconds,
        String imageUrl) {
}
