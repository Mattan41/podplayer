package org.kruskopf.podplayer.backend.podcast.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.junit.jupiter.api.Test;

/**
 * Reads the RSS 2.0 and Atom fixtures through the real parser.
 *
 * <p>No Spring context and no network: {@link RssFeedParser#parseDocument} is
 * the seam that lets the whole mapping run against a file, so the suite stays
 * fast and offline. What these tests pin down is the behaviour real feeds force
 * on a parser &mdash; the guid fallback, items that cannot become episodes, and
 * the two document formats &mdash; rather than the HTTP layer, which is a thin
 * wrapper over {@code RestClient}.</p>
 *
 * <p>The fixtures are in {@code src/test/resources/feeds/}; the comments in
 * them name the case each item represents.</p>
 */
class RssFeedParserTest {

    private final RssFeedParser parser = new RssFeedParser();

    @Test
    void readsRss2FeedWithItsMetadataAndEpisodes() throws IOException {
        ParsedFeed feed = parse("/feeds/rss2-feed.xml");

        assertThat(feed.title()).isEqualTo("Test Podcast");
        assertThat(feed.description()).isEqualTo("A feed used by the parser test.");
        assertThat(feed.author()).isEqualTo("Test Author");
        // Only <itunes:image href="..."/> is in the fixture, so this can only
        // have come from the artwork Rome leaves in foreign markup.
        assertThat(feed.imageUrl()).isEqualTo("https://example.org/podcast-artwork.png");

        // Items 1, 2 and 4 are usable; item 3 has no enclosure and is skipped.
        assertThat(feed.episodes()).hasSize(3);
        assertThat(feed.episodes())
                .extracting(ParsedEpisode::title)
                .containsExactly("Episode One", "Episode Two", "Episode Four");
    }

    @Test
    void readsTheFirstEpisodeFieldByField() throws IOException {
        ParsedEpisode episode = parse("/feeds/rss2-feed.xml").episodes().getFirst();

        assertThat(episode.guid()).isEqualTo("episode-1");
        assertThat(episode.title()).isEqualTo("Episode One");
        assertThat(episode.description()).isEqualTo("The first episode.");
        assertThat(episode.audioUrl()).isEqualTo("https://example.org/audio/episode-1.mp3");
        assertThat(episode.publishedAt()).isEqualTo(Instant.parse("2026-01-05T09:00:00Z"));
        assertThat(episode.durationSeconds()).isEqualTo(3723); // 1:02:03
        assertThat(episode.imageUrl()).isEqualTo("https://example.org/episode-1-artwork.png");
    }

    @Test
    void fallsBackToTheEnclosureUrlWhenTheGuidIsBlank() throws IOException {
        ParsedFeed feed = parse("/feeds/rss2-feed.xml");

        ParsedEpisode noGuid = feed.episodes().get(1);
        assertThat(noGuid.title()).isEqualTo("Episode Two");
        assertThat(noGuid.guid()).isEqualTo("https://example.org/audio/episode-2.mp3");

        // A blank guid and an enclosure that is not typed as audio: still
        // usable, because the URL is what the player needs.
        ParsedEpisode untyped = feed.episodes().get(2);
        assertThat(untyped.title()).isEqualTo("Episode Four");
        assertThat(untyped.guid()).isEqualTo("https://example.org/audio/episode-4.mp3");
        assertThat(untyped.durationSeconds()).isNull();
        assertThat(untyped.publishedAt()).isNull();
    }

    @Test
    void readsAtomFeedWithItsMetadataAndEpisode() throws IOException {
        ParsedFeed feed = parse("/feeds/atom-feed.xml");

        assertThat(feed.title()).isEqualTo("Atom Test Podcast");
        assertThat(feed.description()).isEqualTo("An Atom feed used by the parser test.");
        assertThat(feed.author()).isEqualTo("Atom Author");
        assertThat(feed.imageUrl()).isNull();

        assertThat(feed.episodes()).hasSize(1);
        ParsedEpisode episode = feed.episodes().getFirst();
        assertThat(episode.guid()).isEqualTo("urn:uuid:1d5c0f2a-77a1-4e39-8a1f-6b2c9e4d0a33");
        assertThat(episode.title()).isEqualTo("Atom Episode One");
        assertThat(episode.description()).isEqualTo("The first Atom episode.");
        assertThat(episode.audioUrl()).isEqualTo("https://example.org/audio/atom-episode-1.mp3");
        // <published> wins over the later <updated>.
        assertThat(episode.publishedAt()).isEqualTo(Instant.parse("2026-02-01T07:30:00Z"));
        assertThat(episode.durationSeconds()).isNull();
    }

    @Test
    void readsTheDurationShapesFeedsUse() {
        assertThat(RssFeedParser.parseDurationValue("3723")).isEqualTo(3723);
        assertThat(RssFeedParser.parseDurationValue("12:34")).isEqualTo(754);
        assertThat(RssFeedParser.parseDurationValue("01:02:03")).isEqualTo(3723);
        assertThat(RssFeedParser.parseDurationValue("")).isNull();
        assertThat(RssFeedParser.parseDurationValue("about an hour")).isNull();
        assertThat(RssFeedParser.parseDurationValue(null)).isNull();
    }

    @Test
    void rejectsADocumentThatIsNotAFeed() {
        byte[] html = "<html><body>This is a web page, not a feed.</body></html>"
                .getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> parser.parseDocument(html, "a web page"))
                .isInstanceOf(FeedFetchException.class)
                .hasMessageContaining("is not a readable RSS or Atom feed");
    }

    private ParsedFeed parse(String resource) throws IOException {
        return parser.parseDocument(read(resource), resource);
    }

    private static byte[] read(String resource) throws IOException {
        try (InputStream stream = RssFeedParserTest.class.getResourceAsStream(resource)) {
            if (stream == null) {
                throw new IllegalStateException("Missing test fixture: " + resource);
            }
            return stream.readAllBytes();
        }
    }
}
