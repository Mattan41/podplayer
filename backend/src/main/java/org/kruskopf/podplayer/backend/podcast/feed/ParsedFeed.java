package org.kruskopf.podplayer.backend.podcast.feed;

import java.util.List;

/**
 * A whole feed as read from the wire, before anything is persisted.
 *
 * <p>The parser's output type. It holds no Rome type and no entity, so
 * replacing the parser library later touches only {@link RssFeedParser}.</p>
 *
 * @param title       the feed title. Never blank: a feed that omits one falls
 *                    back to its URL, because {@code podcast.title} is
 *                    {@code NOT NULL} and a missing title is not a reason to
 *                    refuse a subscription
 * @param description the feed description, or {@code null} when the feed omits
 *                    it
 * @param author      the feed author, or {@code null} when the feed omits it
 * @param imageUrl    the feed artwork, or {@code null} when the feed does not
 *                    carry any
 * @param episodes    the usable episodes, in feed order. Items the parser
 *                    could not turn into a playable episode are absent rather
 *                    than present with nulls; each one is logged at WARN
 */
public record ParsedFeed(
        String title,
        String description,
        String author,
        String imageUrl,
        List<ParsedEpisode> episodes) {

    /**
     * Makes the record genuinely immutable, including when a mutable list is
     * passed in by a test or a future parser.
     */
    public ParsedFeed {
        episodes = List.copyOf(episodes);
    }
}
