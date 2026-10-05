package org.kruskopf.podplayer.backend.podcast;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.kruskopf.podplayer.backend.auth.UserRole;
import org.kruskopf.podplayer.backend.auth.WhitelistService;
import org.kruskopf.podplayer.backend.config.SecurityConfig;
import org.kruskopf.podplayer.backend.podcast.feed.RssFeedParser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The HTTP contract of {@code /api/playback}, through MockMvc.
 *
 * <p>The slice imports the real {@link SecurityConfig} and the real
 * {@link PodcastService}, so the two behaviours the Phase E report verified by
 * hand are pinned here rather than restated with a stub:</p>
 *
 * <ul>
 *   <li>A request with no token is rejected by the security filter before the
 *       controller, which is the {@code 401} the API documents.</li>
 *   <li>The statuses and bodies raised by the service &mdash; {@code 404} for an
 *       unstored episode, {@code 400} for a negative position &mdash; are
 *       rendered as a {@code ProblemDetail}, so the last assertions read the
 *       {@code detail} field and not only the status. That is the regression
 *       from entry 34: remove
 *       {@code spring.mvc.problemdetails.enabled} and this test fails.</li>
 * </ul>
 *
 * <p>The service's repositories are mocked only because a web slice has no
 * database; the paths under test never reach them, except the {@code 404} path,
 * whose stubbed empty result is the point.</p>
 */
@WebMvcTest(PlaybackStateController.class)
@Import({SecurityConfig.class, PodcastService.class})
@TestPropertySource(properties = {
        "supabase.jwks-uri=http://localhost/jwks",
        "cors.allowed-origins=http://localhost:3000"})
class PlaybackStateControllerTest {

    private static final String EMAIL = "playback-controller-test@example.invalid";
    private static final String TOKEN = "test-token";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WhitelistService whitelistService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    // PodcastService's constructor dependencies, so the real service can be
    // imported and exercised through the controller.
    @MockitoBean
    private PodcastRepository podcastRepository;
    @MockitoBean
    private EpisodeRepository episodeRepository;
    @MockitoBean
    private SubscriptionRepository subscriptionRepository;
    @MockitoBean
    private PlaybackStateRepository playbackStateRepository;
    @MockitoBean
    private RssFeedParser feedParser;

    @Test
    void getWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/playback/7"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void putWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(put("/api/playback/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"positionSeconds\":10,\"completed\":false}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getReturnsNotFoundWhenNoRowIsStored() throws Exception {
        signIn();
        given(playbackStateRepository.findByIdUserEmailAndIdEpisodeId(EMAIL, 7L))
                .willReturn(Optional.empty());

        mockMvc.perform(get("/api/playback/7").header("Authorization", "Bearer " + TOKEN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("No playback state for episode 7"));
    }

    @Test
    void putRejectsNegativePositionWithTheReasonInDetail() throws Exception {
        signIn();

        mockMvc.perform(put("/api/playback/7")
                        .header("Authorization", "Bearer " + TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"positionSeconds\":-5,\"completed\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("positionSeconds must not be negative"));
    }

    /**
     * Makes the next request carry a decodable token and an allowlisted e-mail,
     * without {@code spring-security-test}: the decoder and the whitelist are
     * the two seams the resource server reads.
     */
    private void signIn() {
        Jwt jwt = Jwt.withTokenValue(TOKEN)
                .header("alg", "ES256")
                .subject(EMAIL)
                .claim("email", EMAIL)
                .build();
        given(jwtDecoder.decode(TOKEN)).willReturn(jwt);
        given(whitelistService.lookup(EMAIL)).willReturn(Optional.of(UserRole.USER));
    }
}
