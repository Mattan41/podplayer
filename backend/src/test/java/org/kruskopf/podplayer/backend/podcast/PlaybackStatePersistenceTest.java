package org.kruskopf.podplayer.backend.podcast;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.kruskopf.podplayer.backend.auth.AllowedUser;
import org.kruskopf.podplayer.backend.auth.AllowedUserRepository;
import org.kruskopf.podplayer.backend.auth.UserRole;
import org.kruskopf.podplayer.backend.podcast.feed.RssFeedParser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

/**
 * The two persistence properties of Phase E that only a real database can
 * show: the write is an upsert on the composite key, and the row disappears
 * with its allowlist entry through {@code ON DELETE CASCADE}.
 *
 * <p>The tests run in {@code @DataJpaTest}'s transaction, which rolls back, so
 * they leave nothing behind whatever database they are pointed at. The e-mail
 * is random per test as well, so a leaked row from a crashed run could not
 * collide with a later one.</p>
 *
 * <p>{@code Replace.NONE} keeps the configured datasource; there is no embedded
 * database on the classpath and none is added, so this is the same database the
 * rest of the suite uses.</p>
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PlaybackStatePersistenceTest {

    private final String email = "phasee-" + UUID.randomUUID() + "@example.invalid";

    @Autowired
    private PlaybackStateRepository playbackStateRepository;
    @Autowired
    private PodcastRepository podcastRepository;
    @Autowired
    private EpisodeRepository episodeRepository;
    @Autowired
    private SubscriptionRepository subscriptionRepository;
    @Autowired
    private AllowedUserRepository allowedUserRepository;
    @Autowired
    private TestEntityManager entityManager;

    @Test
    void secondWriteUpdatesTheExistingRowInsteadOfInsertingAnother() {
        long episodeId = seedEpisode();
        seedAllowedUser();
        PodcastService service = service();

        service.savePlaybackState(email, episodeId, new PlaybackStateUpdateRequest(10, false));
        service.savePlaybackState(email, episodeId, new PlaybackStateUpdateRequest(20, true));

        // Scoped to this test's random e-mail, so the count is the row count for
        // the (user, episode) pair and not the whole shared table.
        List<PlaybackState> rows = playbackStateRepository.findByIdUserEmailOrderByPlayedAtDesc(email);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().getPositionSeconds()).isEqualTo(20);
        assertThat(rows.getFirst().isCompleted()).isTrue();
    }

    @Test
    void deletingTheAllowlistEntryCascadesToPlaybackState() {
        long episodeId = seedEpisode();
        seedAllowedUser();
        service().savePlaybackState(email, episodeId, new PlaybackStateUpdateRequest(10, false));

        assertThat(playbackStateRepository.findByIdUserEmailAndIdEpisodeId(email, episodeId)).isPresent();

        allowedUserRepository.deleteById(email);
        entityManager.flush();
        entityManager.clear();

        assertThat(playbackStateRepository.findByIdUserEmailAndIdEpisodeId(email, episodeId)).isEmpty();
    }

    private PodcastService service() {
        return new PodcastService(podcastRepository, episodeRepository, subscriptionRepository,
                playbackStateRepository, new RssFeedParser());
    }

    private long seedEpisode() {
        Podcast podcast = new Podcast();
        podcast.setFeedUrl("https://example.invalid/phasee/" + UUID.randomUUID() + "/feed.xml");
        podcast.setTitle("Phase E persistence test");
        podcastRepository.saveAndFlush(podcast);

        Episode episode = new Episode();
        episode.setPodcastId(podcast.getId());
        episode.setGuid("phasee-" + UUID.randomUUID());
        episode.setTitle("Phase E persistence episode");
        episode.setAudioUrl("https://example.invalid/phasee/audio.mp3");
        episodeRepository.saveAndFlush(episode);
        return episode.getId();
    }

    private void seedAllowedUser() {
        AllowedUser user = new AllowedUser();
        user.setEmail(email);
        user.setRole(UserRole.USER);
        allowedUserRepository.saveAndFlush(user);
    }
}
