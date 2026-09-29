package org.kruskopf.podplayer.backend.podcast.feed;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.jdom2.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.rometools.rome.feed.synd.SyndContent;
import com.rometools.rome.feed.synd.SyndEnclosure;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.feed.synd.SyndImage;
import com.rometools.rome.feed.synd.SyndPerson;
import com.rometools.rome.io.FeedException;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;

/**
 * Fetches a podcast feed over HTTP and reads it as RSS or Atom.
 *
 * <p>Transport and parsing are deliberately separate. The HTTP request is made
 * with Spring's {@link RestClient}, not by Rome, so that the timeout, the
 * {@code User-Agent} and the TLS behaviour are the project's own and Rome
 * never opens a socket behind our back. The response body is then handed to
 * Rome's {@link SyndFeedInput} as a byte stream, untouched, so a BOM or an XML
 * declaration still decides the encoding.</p>
 *
 * <p>Everything Rome-specific stays inside this class: the result is the
 * project's own {@link ParsedFeed}, so replacing Rome later touches this file
 * and nothing else. Failures are reported as {@link FeedFetchException}, never
 * as a Rome or Spring exception.</p>
 *
 * <p>{@link #parseDocument} is package-private rather than public, so that
 * {@code RssFeedParserTest} can feed it fixture documents without a network
 * call. The class has exactly one public method, {@link #parse(String)}.</p>
 */
@Service
public class RssFeedParser {

    private static final Logger LOG = LoggerFactory.getLogger(RssFeedParser.class);

    /**
     * Applied to both connecting and reading, so a feed host that accepts a
     * connection and then stalls cannot hold a request thread indefinitely.
     */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /**
     * Some feed hosts reject requests carrying the default Java agent, so a
     * product agent is sent instead. It is deliberately a bare product token:
     * no environment-specific hostname belongs in source.
     */
    private static final String USER_AGENT = "podplayer/0.1";

    private static final String ACCEPT =
            "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8";

    private final RestClient restClient;

    public RssFeedParser() {
        this(defaultRestClient());
    }

    private RssFeedParser(RestClient restClient) {
        this.restClient = restClient;
    }

    /**
     * Fetches a feed and reads it.
     *
     * @param feedUrl the absolute {@code http} or {@code https} URL of an RSS
     *                or Atom feed
     * @return the feed's metadata and its usable episodes
     * @throws FeedFetchException if the URL is unusable, the upstream cannot be
     *                            reached, or the response is not a readable
     *                            feed. {@link FeedFetchException#getKind()}
     *                            says which
     */
    public ParsedFeed parse(String feedUrl) {
        URI uri = toHttpUri(feedUrl);
        byte[] document = fetch(uri);
        return parseDocument(document, uri.toString());
    }

    private static RestClient defaultRestClient() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(TIMEOUT);
        return RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, ACCEPT)
                .build();
    }

    private byte[] fetch(URI uri) {
        byte[] body;
        try {
            body = restClient.get().uri(uri).retrieve().body(byte[].class);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is5xxServerError()) {
                throw new FeedFetchException(FeedFetchException.Kind.UPSTREAM_UNAVAILABLE,
                        "The feed at " + uri + " answered with HTTP " + e.getStatusCode().value(), e);
            }
            throw new FeedFetchException(FeedFetchException.Kind.INVALID_REQUEST,
                    "The feed at " + uri + " answered with HTTP " + e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            throw new FeedFetchException(FeedFetchException.Kind.UPSTREAM_UNAVAILABLE,
                    "The feed at " + uri + " could not be reached: " + e.getMessage(), e);
        }
        if (body == null || body.length == 0) {
            throw new FeedFetchException(FeedFetchException.Kind.NOT_A_FEED,
                    "The feed at " + uri + " returned an empty body");
        }
        return body;
    }

    private static URI toHttpUri(String feedUrl) {
        if (feedUrl == null || feedUrl.isBlank()) {
            throw new FeedFetchException(FeedFetchException.Kind.INVALID_REQUEST, "A feed URL is required");
        }
        String trimmed = feedUrl.trim();
        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException e) {
            throw new FeedFetchException(FeedFetchException.Kind.INVALID_REQUEST,
                    "Not a valid URL: " + trimmed, e);
        }
        String scheme = uri.getScheme();
        boolean http = scheme != null
                && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
        if (!http || uri.getHost() == null) {
            throw new FeedFetchException(FeedFetchException.Kind.INVALID_REQUEST,
                    "A feed URL must be an absolute http or https URL: " + trimmed);
        }
        return uri;
    }

    /**
     * Reads an already-fetched document. Package-private test seam; see the
     * class Javadoc.
     *
     * @param document the raw response body, untouched, so that Rome can honour
     *                 a BOM or an XML declaration
     * @param source   a name for the document, used in log lines and in error
     *                 messages so the origin of a bad feed is identifiable
     * @return the feed's metadata and its usable episodes
     * @throws FeedFetchException if the document is not a readable feed
     */
    ParsedFeed parseDocument(byte[] document, String source) {
        SyndFeed feed;
        try {
            SyndFeedInput input = new SyndFeedInput();
            // A feed document never needs a DTD, and allowing one would let a
            // hostile feed pull local files or URLs into the parser (XXE). The
            // cost is that a feed carrying a DOCTYPE is rejected as unreadable;
            // that trade is deliberate and is recorded in docs/DECISIONS.md.
            input.setAllowDoctypes(false);
            feed = input.build(new XmlReader(new ByteArrayInputStream(document), true));
        } catch (FeedException | IllegalArgumentException | IOException e) {
            throw new FeedFetchException(FeedFetchException.Kind.NOT_A_FEED,
                    source + " is not a readable RSS or Atom feed: " + e.getMessage(), e);
        }
        return toParsedFeed(feed, source);
    }

    private static ParsedFeed toParsedFeed(SyndFeed feed, String source) {
        List<ParsedEpisode> episodes = new ArrayList<>();
        for (SyndEntry entry : feed.getEntries()) {
            toParsedEpisode(entry, source).ifPresent(episodes::add);
        }
        return new ParsedFeed(
                firstNonBlank(feed.getTitle(), source),
                blankToNull(feed.getDescription()),
                authorOf(feed),
                imageUrlOf(feed),
                episodes);
    }

    private static Optional<ParsedEpisode> toParsedEpisode(SyndEntry entry, String source) {
        String audioUrl = enclosureUrlOf(entry);
        if (audioUrl == null) {
            // Covers both "no enclosure at all" and "no guid and no
            // enclosure". Without audio there is nothing to play, and
            // episode.audio_url is NOT NULL, so the item cannot become a row.
            LOG.warn("Skipping an item of {} with no playable enclosure (title: {})",
                    source, entry.getTitle());
            return Optional.empty();
        }
        // The feed's guid, falling back to the enclosure URL: that is the only
        // other value in an item which is stable across fetches.
        String guid = firstNonBlank(entry.getUri(), audioUrl);
        return Optional.of(new ParsedEpisode(
                guid,
                firstNonBlank(entry.getTitle(), audioUrl),
                descriptionOf(entry),
                audioUrl,
                publishedAtOf(entry),
                durationSecondsOf(entry),
                foreignImageHref(entry.getForeignMarkup())));
    }

    private static String enclosureUrlOf(SyndEntry entry) {
        String fallback = null;
        for (SyndEnclosure enclosure : entry.getEnclosures()) {
            String url = enclosure.getUrl();
            if (isBlank(url)) {
                continue;
            }
            String type = enclosure.getType();
            if (type != null && type.toLowerCase(Locale.ROOT).startsWith("audio/")) {
                return url.trim();
            }
            if (fallback == null) {
                fallback = url.trim();
            }
        }
        return fallback;
    }

    private static String descriptionOf(SyndEntry entry) {
        SyndContent description = entry.getDescription();
        if (description != null && !isBlank(description.getValue())) {
            return description.getValue().trim();
        }
        // Atom entries often carry only <content>, with no <summary>.
        for (SyndContent content : entry.getContents()) {
            if (content != null && !isBlank(content.getValue())) {
                return content.getValue().trim();
            }
        }
        return null;
    }

    private static Instant publishedAtOf(SyndEntry entry) {
        Date published = entry.getPublishedDate();
        if (published != null) {
            return published.toInstant();
        }
        // Atom's <updated> is the fallback when <published> is absent.
        Date updated = entry.getUpdatedDate();
        return updated == null ? null : updated.toInstant();
    }

    private static String authorOf(SyndFeed feed) {
        for (SyndPerson person : feed.getAuthors()) {
            String name = firstNonBlank(person.getName(), person.getEmail());
            if (name != null) {
                return name;
            }
        }
        // Podcast feeds state the author as <itunes:author>, which Rome leaves
        // in foreign markup because the iTunes module is not on the classpath.
        // Without this fallback podcast.author would be null for almost every
        // feed this project subscribes to.
        return foreignText(feed.getForeignMarkup(), "author");
    }

    /**
     * Reads the text of the first foreign element with the given name.
     *
     * <p>Used for the iTunes tags a podcast feed carries. Rome ships the Dublin
     * Core, content, slash, syndication and GeoRSS modules in its core artifact
     * but not the iTunes one, so {@code itunes:author}, {@code itunes:duration}
     * and {@code itunes:image} survive the parse as foreign markup. This was
     * measured, not assumed: see {@code RssFeedParserTest} and its fixtures.</p>
     *
     * @param foreignMarkup the elements Rome did not recognise
     * @param elementName   the local name to look for, namespace ignored
     * @return the trimmed text, or {@code null} when absent or blank
     */
    private static String foreignText(List<Element> foreignMarkup, String elementName) {
        for (Element element : foreignMarkup) {
            if (elementName.equals(element.getName())) {
                String text = element.getTextTrim();
                if (!isBlank(text)) {
                    return text;
                }
            }
        }
        return null;
    }

    private static String imageUrlOf(SyndFeed feed) {
        SyndImage image = feed.getImage();
        if (image != null && !isBlank(image.getUrl())) {
            return image.getUrl().trim();
        }
        // Podcast feeds usually carry artwork as <itunes:image href="..."/>,
        // which Rome leaves in foreign markup because the iTunes module is not
        // on the classpath.
        return foreignImageHref(feed.getForeignMarkup());
    }

    private static String foreignImageHref(List<Element> foreignMarkup) {
        for (Element element : foreignMarkup) {
            if ("image".equals(element.getName())) {
                String href = element.getAttributeValue("href");
                if (!isBlank(href)) {
                    return href.trim();
                }
            }
        }
        return null;
    }

    private static Integer durationSecondsOf(SyndEntry entry) {
        // <itunes:duration> arrives as foreign markup; see foreignText.
        return parseDurationValue(foreignText(entry.getForeignMarkup(), "duration"));
    }

    /**
     * Reads the shapes feeds use for a duration: bare seconds, {@code H:MM:SS}
     * and {@code MM:SS}.
     *
     * @param value the raw duration text, may be {@code null}
     * @return the duration in seconds, or {@code null} when the text is absent,
     *         not numeric, or too large to be a real duration
     */
    static Integer parseDurationValue(String value) {
        if (isBlank(value)) {
            return null;
        }
        long total = 0;
        for (String part : value.trim().split(":")) {
            String digits = part.trim();
            if (digits.isEmpty() || digits.length() > 9 || !digits.chars().allMatch(Character::isDigit)) {
                return null;
            }
            total = total * 60 + Long.parseLong(digits);
            if (total > Integer.MAX_VALUE) {
                return null;
            }
        }
        return (int) total;
    }

    private static String firstNonBlank(String first, String second) {
        if (!isBlank(first)) {
            return first.trim();
        }
        return isBlank(second) ? null : second.trim();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
