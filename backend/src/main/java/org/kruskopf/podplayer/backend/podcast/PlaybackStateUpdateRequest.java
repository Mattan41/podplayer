package org.kruskopf.podplayer.backend.podcast;

/**
 * Write model of a playback-position update.
 *
 * <p>The body is a full replacement of the two state columns: a {@code PUT}
 * sets both, whether the row already exists or is created by this call. There
 * is no partial-update shape in this API.</p>
 *
 * @param positionSeconds where the listener is, in seconds from the start; must
 *                        not be negative, matching the {@code
 *                        playback_state_position_seconds_check} constraint
 * @param completed       whether playback has reached the end of the episode
 */
public record PlaybackStateUpdateRequest(
        int positionSeconds,
        boolean completed) {
}
