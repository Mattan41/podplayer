package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.kruskopf.podplayer.backend.auth.Emails;
import org.kruskopf.podplayer.backend.podcast.feed.FeedFetchException;
import org.kruskopf.podplayer.backend.podcast.feed.ParsedEpisode;
import org.kruskopf.podplayer.backend.podcast.feed.ParsedFeed;
import org.kruskopf.podplayer.backend.podcast.feed.RssFeedParser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Subscriptions and feed ingestion: the application service behind
 * {@code /api/podcasts}.
 *
 * <p>Method contracts, all keyed on the current user's e-mail address as taken
 * from the JWT's {@code email} claim:</p>
 *
 * <ul>
 *   <li>{@link #subscribe(String, String)} returns {@link SubscribeResult}: the
 *       stored podcast with its episode count, plus whether the user was
 *       already following it. Subscribing twice is not an error, and the feed
 *       is read again on the second call, so a re-subscribe also refreshes.</li>
 *   <li>{@link #refresh(long)} returns {@link RefreshResult}: the podcast after
 *       the refresh plus how many episodes were added. Adding none is a normal
 *       result, not a failure.</li>
 *   <li>{@link #listSubscriptions(String)} returns {@link PodcastSummaryDto}s,
 *       one per follow, ordered by title.</li>
 *   <li>{@link #listEpisodes(long, String, int, int)} returns an
 *       {@link EpisodePageDto}: one page of {@link EpisodeDto}s, newest first,
 *       plus the total, and refuses to list a podcast the caller does not
 *       follow.</li>
 * </ul>
 *
 * <p>Three properties of the implementation are deliberate:</p>
 *
 * <ol>
 *   <li><strong>The feed is read before the first database call.</strong> The
 *       transaction is already open when {@code subscribe} starts, but
 *       Hibernate acquires the pooled connection lazily, so ordering the work
 *       this way means a slow feed host cannot pin one of the pool's three
 *       connections for ten seconds. Do not move the fetch after the first
 *       repository call.</li>
 *   <li><strong>The session e-mail is normalised here.</strong>
 *       {@code subscription.user_email} is a foreign key to
 *       {@code allowed_users(email)}, whose values are lower-cased by
 *       {@link Emails#normalize}. Normalising in one place stops a stray
 *       upper-case JWT claim from becoming a foreign key violation; see
 *       {@code DECISIONS.md} entry 16.</li>
 *   <li><strong>Failures are signalled as {@link ResponseStatusException}.</strong>
 *       There is one error mechanism in this backend and this is it, so the
 *       controller stays a thin adapter instead of mapping a second exception
 *       hierarchy. The cost is that this service knows about HTTP status
 *       codes.</li>
 * </ol>
 *
 * <p>Known costs, accepted for now: the subscription list issues one count
 * query per follow, which is fine for the tens of podcasts a listener has but
 * should become a single grouped query if the list grows; and two concurrent
 * subscribes to the same new feed race on the unique {@code podcast.feed_url},
 * in which case one of them fails rather than being retried.</p>
 */
@Service
public class PodcastService {

    /** Page size used when a caller does not ask for one. */
    public static final int DEFAULT_EPISODE_PAGE_SIZE = 50;

    /** Largest page a caller may ask for, so one request cannot read the table. */
    public static final int MAX_EPISODE_PAGE_SIZE = 100;

    private final PodcastRepository podcastRepository;
    private final EpisodeRepository episodeRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PlaybackStateRepository playbackStateRepository;
    private final RssFeedParser feedParser;

    public PodcastService(PodcastRepository podcastRepository,
                          EpisodeRepository episodeRepository,
                          SubscriptionRepository subscriptionRepository,
                          PlaybackStateRepository playbackStateRepository,
                          RssFeedParser feedParser) {
        this.podcastRepository = podcastRepository;
        this.episodeRepository = episodeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.playbackStateRepository = playbackStateRepository;
        this.feedParser = feedParser;
    }

    /**
     * Subscribes the given user to a feed, importing the feed's episodes.
     *
     * <p>Idempotent in the sense that matters to a caller: subscribing to a feed
     * that is already known reuses the existing podcast row, inserts only
     * episodes whose guid is not already stored, and reports
     * {@link SubscribeResult#alreadySubscribed()} instead of failing. The feed
     * is read on every call, so a re-subscribe also refreshes the podcast.</p>
     *
     * @param userEmail the subscriber's e-mail address, in any casing
     * @param feedUrl   the absolute {@code http} or {@code https} feed URL
     * @return the stored podcast with its episode count, and whether the user
     *         was already subscribed
     * @throws ResponseStatusException {@code 400} when the feed URL is unusable
     *                                 or the document is not a feed, {@code 502}
     *                                 when the feed host cannot be reached or
     *                                 answers with 5xx, {@code 401} when the
     *                                 caller has no usable e-mail address
     */
    @Transactional
    public SubscribeResult subscribe(String userEmail, String feedUrl) {
        String user = normalizeUser(userEmail);
        ParsedFeed feed = fetchFeed(feedUrl);
        // Non-null and trim-safe only because fetchFeed rejected a blank URL
        // above; keep this order if the code is reorganised.
        String url = feedUrl.trim();

        Podcast podcast = podcastRepository.findByFeedUrl(url).orElseGet(Podcast::new);
        podcast.setFeedUrl(url);
        applyFeedMetadata(podcast, feed);
        podcast = podcastRepository.save(podcast);

        insertNewEpisodes(podcast.getId(), feed.episodes());

        SubscriptionId subscriptionId = new SubscriptionId(user, podcast.getId());
        boolean alreadySubscribed = subscriptionRepository.existsById(subscriptionId);
        if (!alreadySubscribed) {
            subscriptionRepository.save(new Subscription(subscriptionId));
        }

        return new SubscribeResult(
                PodcastDto.from(podcast, episodeRepository.countByPodcastId(podcast.getId())),
                alreadySubscribed);
    }

    /**
     * Re-reads a feed and imports whatever it has that is not stored yet.
     *
     * @param podcastId the podcast to refresh
     * @return the podcast after the refresh, and how many episodes were added
     * @throws ResponseStatusException {@code 404} when no podcast has that id,
     *                                 plus the {@code 400} and {@code 502} cases
     *                                 of {@link #subscribe(String, String)}
     */
    @Transactional
    public RefreshResult refresh(long podcastId) {
        Podcast podcast = podcastRepository.findById(podcastId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No podcast with id " + podcastId));

        ParsedFeed feed = fetchFeed(podcast.getFeedUrl());
        int added = insertNewEpisodes(podcast.getId(), feed.episodes());
        applyFeedMetadata(podcast, feed);
        podcast = podcastRepository.save(podcast);

        return new RefreshResult(
                PodcastDto.from(podcast, episodeRepository.countByPodcastId(podcast.getId())),
                added);
    }

    /**
     * Lists the podcasts the given user follows, ordered by title.
     *
     * @param userEmail the subscriber's e-mail address, in any casing
     * @return one summary per follow; empty when the user follows nothing
     * @throws ResponseStatusException {@code 401} when the caller has no usable
     *                                 e-mail address
     */
    @Transactional(readOnly = true)
    public List<PodcastSummaryDto> listSubscriptions(String userEmail) {
        String user = normalizeUser(userEmail);
        List<Subscription> subscriptions = subscriptionRepository.findByIdUserEmail(user);
        if (subscriptions.isEmpty()) {
            return List.of();
        }
        Map<Long, Podcast> podcastsById = podcastRepository
                .findAllById(subscriptions.stream()
                        .map(subscription -> subscription.getId().getPodcastId())
                        .toList())
                .stream()
                .collect(Collectors.toMap(Podcast::getId, Function.identity()));

        List<PodcastSummaryDto> summaries = new ArrayList<>(subscriptions.size());
        for (Subscription subscription : subscriptions) {
            Podcast podcast = podcastsById.get(subscription.getId().getPodcastId());
            if (podcast == null) {
                // The ON DELETE CASCADE foreign key makes this impossible;
                // skipping rather than throwing keeps one bad row from hiding
                // the rest of the list.
                continue;
            }
            summaries.add(PodcastSummaryDto.from(subscription, podcast,
                    episodeRepository.countByPodcastId(podcast.getId())));
        }
        summaries.sort(Comparator.comparing(PodcastSummaryDto::title,
                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return summaries;
    }

    /**
     * Lists one page of a podcast's episodes, newest first.
     *
     * <p>A caller who does not follow the podcast gets {@code 403} rather than
     * an empty page, so the endpoint cannot be used to enumerate the episode
     * catalogue of podcasts the user has not subscribed to.</p>
     *
     * <p>The page is zero-based. A page past the end is not an error: it returns
     * an empty {@link EpisodePageDto} whose {@code total} still tells the caller
     * how many episodes exist, which is what a "load more" client needs.</p>
     *
     * @param podcastId the podcast whose episodes are wanted
     * @param userEmail the caller's e-mail address, in any casing
     * @param page      the zero-based page to read; a negative value is rejected
     * @param size      the page size; clamped to
     *                  {@value #MAX_EPISODE_PAGE_SIZE}, and a non-positive value
     *                  falls back to {@value #DEFAULT_EPISODE_PAGE_SIZE}
     * @return one page of the podcast's episodes, newest first; empty for a
     *         podcast the caller follows but which has no episodes yet
     * @throws ResponseStatusException {@code 404} when no podcast has that id,
     *                                 {@code 400} when {@code page} is negative,
     *                                 {@code 403} when the caller does not follow
     *                                 it, {@code 401} when the caller has no
     *                                 usable e-mail address
     */
    @Transactional(readOnly = true)
    public EpisodePageDto listEpisodes(long podcastId, String userEmail, int page, int size) {
        String user = normalizeUser(userEmail);
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "page must not be negative");
        }
        if (!podcastRepository.existsById(podcastId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No podcast with id " + podcastId);
        }
        if (!subscriptionRepository.existsByIdUserEmailAndIdPodcastId(user, podcastId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not subscribed to podcast " + podcastId);
        }
        Page<Episode> result = episodeRepository.findPageByPodcastId(
                podcastId, PageRequest.of(page, clampPageSize(size)));
        return EpisodePageDto.from(result);
    }

    /**
     * Reads the caller's stored position in an episode.
     *
     * <p>A missing row is not an error the client should show: it means the
     * episode has not been started, and the caller is expected to start at 0.
     * It is reported as {@code 404} because the resource &mdash; this user's
     * state for this episode &mdash; genuinely does not exist, which keeps
     * {@link PlaybackStateDto#playedAt()} non-null on every {@code 200}.</p>
     *
     * @param userEmail the caller's e-mail address, in any casing
     * @param episodeId the episode whose position is wanted
     * @return the stored position
     * @throws ResponseStatusException {@code 404} when nothing is stored for
     *                                 that episode, {@code 401} when the caller
     *                                 has no usable e-mail address
     */
    @Transactional(readOnly = true)
    public PlaybackStateDto getPlaybackState(String userEmail, long episodeId) {
        String user = normalizeUser(userEmail);
        return playbackStateRepository.findByIdUserEmailAndIdEpisodeId(user, episodeId)
                .map(PlaybackStateDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No playback state for episode " + episodeId));
    }

    /**
     * Stores the caller's position in an episode, creating the row on the first
     * write.
     *
     * <p>This is a read-then-mutate upsert rather than a bare {@code save} on a
     * detached entity. {@link PlaybackState} has an {@code @EmbeddedId} and no
     * surrogate key, so a {@code save} with an id already present is an upsert
     * in JPA, but that would leave the timestamp semantics implicit. Reading the
     * existing row first lets the code say plainly what is written when:</p>
     *
     * <ul>
     *   <li><strong>Every write</strong> sets {@code position_seconds} and
     *       {@code completed} from the request, and refreshes
     *       {@code played_at} to now. {@code played_at} is the last-write
     *       marker, not a first-seen marker &mdash; see the note on
     *       {@link PlaybackState#getPlayedAt()}.</li>
     *   <li><strong>Only the first write</strong> sets the row's identity, the
     *       embedded id {@code (user_email, episode_id)}. There is no
     *       insert-only state column in {@code playback_state}; an existing row
     *       keeps its id and has its three state columns overwritten.</li>
     * </ul>
     *
     * @param userEmail the caller's e-mail address, in any casing
     * @param episodeId the episode being reported on
     * @param request   the position and completion flag to store
     * @return the stored state after the write
     * @throws ResponseStatusException {@code 400} when the position is negative,
     *                                 {@code 404} when no episode has that id,
     *                                 {@code 401} when the caller has no usable
     *                                 e-mail address
     */
    @Transactional
    public PlaybackStateDto savePlaybackState(String userEmail, long episodeId,
                                              PlaybackStateUpdateRequest request) {
        String user = normalizeUser(userEmail);
        if (request.positionSeconds() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "positionSeconds must not be negative");
        }
        if (!episodeRepository.existsById(episodeId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No episode with id " + episodeId);
        }

        PlaybackStateId id = new PlaybackStateId(user, episodeId);
        PlaybackState state = playbackStateRepository.findByIdUserEmailAndIdEpisodeId(user, episodeId)
                .orElseGet(() -> new PlaybackState(id));
        state.setPositionSeconds(request.positionSeconds());
        state.setCompleted(request.completed());
        state.setPlayedAt(Instant.now());
        return PlaybackStateDto.from(playbackStateRepository.save(state));
    }

    private static int clampPageSize(int size) {
        if (size <= 0) {
            return DEFAULT_EPISODE_PAGE_SIZE;
        }
        return Math.min(size, MAX_EPISODE_PAGE_SIZE);
    }

    private static String normalizeUser(String userEmail) {
        String user = Emails.normalize(userEmail);
        if (user == null || user.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "The authenticated caller has no e-mail address");
        }
        return user;
    }

    private ParsedFeed fetchFeed(String feedUrl) {
        try {
            return feedParser.parse(feedUrl);
        } catch (FeedFetchException e) {
            throw toStatusException(e);
        }
    }

    /**
     * Turns a parser failure into the status code this API documents: it is
     * either what the caller supplied or what the upstream did. The parser's
     * exception is kept as the cause, so the server log still shows it.
     */
    private static ResponseStatusException toStatusException(FeedFetchException e) {
        HttpStatus status = switch (e.getKind()) {
            case INVALID_REQUEST, NOT_A_FEED -> HttpStatus.BAD_REQUEST;
            case UPSTREAM_UNAVAILABLE -> HttpStatus.BAD_GATEWAY;
        };
        return new ResponseStatusException(status, e.getMessage(), e);
    }

    /**
     * Overwrites the podcast's metadata with the feed's, leaving any field the
     * feed did not supply as it was. Nulls are skipped on purpose: a feed that
     * momentarily omits its artwork must not erase artwork already stored.
     *
     * <p>{@code lastFetchedAt} is always written, because the feed has just been
     * read successfully by the time this runs.</p>
     */
    private static void applyFeedMetadata(Podcast podcast, ParsedFeed feed) {
        if (!Objects.equals(podcast.getTitle(), feed.title())) {
            podcast.setTitle(feed.title());
        }
        if (feed.description() != null && !Objects.equals(podcast.getDescription(), feed.description())) {
            podcast.setDescription(feed.description());
        }
        if (feed.author() != null && !Objects.equals(podcast.getAuthor(), feed.author())) {
            podcast.setAuthor(feed.author());
        }
        if (feed.imageUrl() != null && !Objects.equals(podcast.getImageUrl(), feed.imageUrl())) {
            podcast.setImageUrl(feed.imageUrl());
        }
        podcast.setLastFetchedAt(Instant.now());
    }

    /**
     * Inserts the parsed episodes that are not stored yet and reports how many
     * were added.
     *
     * <p>The uniqueness check happens in memory rather than by catching the
     * database's {@code (podcast_id, guid)} violation: a failed insert aborts
     * the surrounding PostgreSQL transaction, which would take the subscription
     * write down with it. Deduplicating against the stored guids also absorbs a
     * feed that repeats a guid within a single document.</p>
     */
    private int insertNewEpisodes(Long podcastId, List<ParsedEpisode> parsedEpisodes) {
        Set<String> knownGuids = episodeRepository.findByPodcastIdOrderByPublishedAtDesc(podcastId)
                .stream()
                .map(Episode::getGuid)
                .collect(Collectors.toCollection(HashSet::new));

        List<Episode> toInsert = new ArrayList<>();
        for (ParsedEpisode parsed : parsedEpisodes) {
            if (!knownGuids.add(parsed.guid())) {
                continue;
            }
            toInsert.add(toEpisode(podcastId, parsed));
        }
        if (toInsert.isEmpty()) {
            return 0;
        }
        episodeRepository.saveAll(toInsert);
        return toInsert.size();
    }

    private static Episode toEpisode(Long podcastId, ParsedEpisode parsed) {
        Episode episode = new Episode();
        episode.setPodcastId(podcastId);
        episode.setGuid(parsed.guid());
        episode.setTitle(parsed.title());
        episode.setDescription(parsed.description());
        episode.setAudioUrl(parsed.audioUrl());
        episode.setPublishedAt(parsed.publishedAt());
        episode.setDurationSeconds(parsed.durationSeconds());
        episode.setImageUrl(parsed.imageUrl());
        return episode;
    }
}
