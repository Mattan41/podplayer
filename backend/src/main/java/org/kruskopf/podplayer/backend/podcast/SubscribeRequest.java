package org.kruskopf.podplayer.backend.podcast;

/**
 * Write model of a subscribe request.
 *
 * @param feedUrl the absolute {@code http} or {@code https} URL of the RSS or
 *                Atom feed to subscribe to
 */
public record SubscribeRequest(String feedUrl) {
}
