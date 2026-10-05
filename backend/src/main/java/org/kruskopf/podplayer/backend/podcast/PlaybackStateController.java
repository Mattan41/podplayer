package org.kruskopf.podplayer.backend.podcast;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Playback position for a single episode.
 *
 * <p>The resource is the caller's state for an episode, not the episode itself,
 * which is why the path is {@code /api/playback/{episodeId}} rather than
 * {@code /api/episodes/{id}/playback}; see {@code docs/api/playback.md} and
 * {@code docs/roadmap/playback-state.md}.</p>
 *
 * <p>Returns DTOs, never entities, and leaves every error case to
 * {@link PodcastService}, which raises {@code ResponseStatusException} with the
 * status this API documents. This mirrors {@link PodcastController}.</p>
 *
 * <p><strong>Authorization.</strong> The class-level {@code @PreAuthorize}
 * declares the requirement, per {@code DECISIONS.md} entry 15; it is enforced
 * via {@code @EnableMethodSecurity} on {@code SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/playback")
@PreAuthorize("isAuthenticated()")
public class PlaybackStateController {

    private final PodcastService podcastService;

    public PlaybackStateController(PodcastService podcastService) {
        this.podcastService = podcastService;
    }

    /**
     * @param episodeId the episode whose stored position is wanted
     * @param auth      the authenticated caller, whose name is the JWT e-mail
     *                  claim
     * @return the caller's stored position for that episode, or {@code 404} when
     *         none is stored yet, so a client starts the episode at 0
     */
    @GetMapping("/{episodeId}")
    public PlaybackStateDto getPlaybackState(@PathVariable long episodeId, Authentication auth) {
        return podcastService.getPlaybackState(auth.getName(), episodeId);
    }

    /**
     * Stores the caller's position, creating the row on first write.
     *
     * @param episodeId the episode being reported on
     * @param request   the position and completion flag to store
     * @param auth      the authenticated caller
     * @return the stored state after the write
     */
    @PutMapping("/{episodeId}")
    public PlaybackStateDto savePlaybackState(@PathVariable long episodeId,
                                              @RequestBody PlaybackStateUpdateRequest request,
                                              Authentication auth) {
        return podcastService.savePlaybackState(auth.getName(), episodeId, request);
    }
}
