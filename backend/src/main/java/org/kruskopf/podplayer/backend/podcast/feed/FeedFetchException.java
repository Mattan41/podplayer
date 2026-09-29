package org.kruskopf.podplayer.backend.podcast.feed;

/**
 * Signals that a feed could not be fetched, or could not be read as a feed.
 *
 * <p>This is the only exception {@link RssFeedParser} throws. Rome's
 * {@code FeedException} and Spring's {@code RestClientException} are caught
 * inside the parser and wrapped here, so no library type ever reaches a
 * caller and the reason for the failure travels in {@link #getKind()} instead
 * of having to be read out of a message string.</p>
 *
 * <p>The kind exists so the HTTP layer can pick a status code without
 * inspecting prose: a bad URL, or a page that is not a feed, is the caller's
 * problem, while an upstream that is unreachable or failing is not.</p>
 */
public class FeedFetchException extends RuntimeException {

    /**
     * Why the fetch or the parse failed.
     */
    public enum Kind {

        /**
         * The URL is blank, malformed or not http/https, or the upstream
         * answered with a 4xx status. The caller supplied something that
         * cannot work.
         */
        INVALID_REQUEST,

        /**
         * The upstream responded, but the body is not a readable RSS or Atom
         * document.
         */
        NOT_A_FEED,

        /**
         * The upstream could not be reached at all, the request timed out, or
         * the upstream answered with a 5xx status.
         */
        UPSTREAM_UNAVAILABLE
    }

    private final Kind kind;

    /**
     * @param kind    why the fetch failed
     * @param message a message that describes the failure without exposing
     *                library internals
     */
    public FeedFetchException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    /**
     * @param kind    why the fetch failed
     * @param message a message that describes the failure without exposing
     *                library internals
     * @param cause   the wrapped library exception, kept for diagnostics
     */
    public FeedFetchException(Kind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
    }

    /**
     * @return why the fetch or the parse failed
     */
    public Kind getKind() {
        return kind;
    }
}
