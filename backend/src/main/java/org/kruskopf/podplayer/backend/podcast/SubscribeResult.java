package org.kruskopf.podplayer.backend.podcast;

/**
 * Result of a subscribe request.
 *
 * <p>Whether the user was already subscribed is part of the body as well as
 * the status code, so a client does not have to distinguish 200 from 201 to
 * render "already subscribed" &mdash; and neither does a test.</p>
 *
 * @param podcast           the podcast that was subscribed to, with its current
 *                          episode count
 * @param alreadySubscribed {@code true} when the user was following this podcast
 *                          before the request. The feed was still read, so the
 *                          podcast and its episodes may have been updated
 */
public record SubscribeResult(
        PodcastDto podcast,
        boolean alreadySubscribed) {
}
