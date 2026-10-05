package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

/**
 * Read model of a listener's playback state for one episode.
 *
 * <p>It is the stored row minus the user: the caller's identity comes from the
 * JWT {@code email} claim and is never echoed back, so the read model carries
 * only the episode the state belongs to and the state itself. The entity is
 * kept out of the HTTP layer, matching every other response in this API
 * ({@code DECISIONS.md} entry 16 and {@code docs/api/podcasts.md}).</p>
 *
 * @param episodeId       the episode the state belongs to, which is also the id
 *                        in the request path
 * @param positionSeconds where the listener left off, in seconds from the start
 * @param playedAt        when the position was last written; never {@code null}
 * @param completed       {@code true} once playback reached the end of the
 *                        episode. In this phase the flag is set by playback
 *                        reaching the end, not by a user action; see
 *                        {@code docs/api/playback.md}
 */
public record PlaybackStateDto(
        Long episodeId,
        int positionSeconds,
        Instant playedAt,
        boolean completed) {

    /**
     * Maps a persisted playback-state row onto the read model.
     *
     * @param state the entity to map
     * @return the equivalent DTO
     */
    public static PlaybackStateDto from(PlaybackState state) {
        return new PlaybackStateDto(
                state.getId().getEpisodeId(),
                state.getPositionSeconds(),
                state.getPlayedAt(),
                state.isCompleted());
    }
}
