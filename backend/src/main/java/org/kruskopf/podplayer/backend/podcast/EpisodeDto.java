package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

/**
 * Read model of one episode, used by the episode list.
 *
 * <p>The entity is kept out of the HTTP layer, which also means the client
 * never sees {@code podcastId} it already knows, and never sees a lazy
 * association that {@code open-in-view: false} would break.</p>
 *
 * @param id              surrogate key
 * @param guid            the feed's identifier for the episode, which is unique
 *                        only within its podcast
 * @param title           the episode title
 * @param description     the episode summary, or {@code null}
 * @param audioUrl        the enclosure URL to play
 * @param publishedAt     the publication timestamp, or {@code null} when the
 *                        feed omits it
 * @param durationSeconds the duration in seconds, or {@code null} when the feed
 *                        omits it or states it in a form that cannot be read
 * @param imageUrl        the episode artwork, or {@code null}
 */
public record EpisodeDto(
        Long id,
        String guid,
        String title,
        String description,
        String audioUrl,
        Instant publishedAt,
        Integer durationSeconds,
        String imageUrl) {

    /**
     * Maps a persisted episode onto the read model.
     *
     * @param episode the entity to map
     * @return the equivalent DTO
     */
    public static EpisodeDto from(Episode episode) {
        return new EpisodeDto(
                episode.getId(),
                episode.getGuid(),
                episode.getTitle(),
                episode.getDescription(),
                episode.getAudioUrl(),
                episode.getPublishedAt(),
                episode.getDurationSeconds(),
                episode.getImageUrl());
    }
}
