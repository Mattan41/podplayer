package org.kruskopf.podplayer.backend.podcast;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Podcast subscriptions and episode lists.
 *
 * <p>Returns DTOs, never entities, and leaves every error case to
 * {@link PodcastService}, which raises {@code ResponseStatusException} with the
 * status this API documents; see {@code docs/api/podcasts.md}.</p>
 *
 * <p><strong>Authorization.</strong> The class-level {@code @PreAuthorize}
 * declares the requirement, per {@code DECISIONS.md} entry 15. It is enforced
 * via {@code @EnableMethodSecurity} on {@code SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/podcasts")
@PreAuthorize("isAuthenticated()")
public class PodcastController {

    private final PodcastService podcastService;

    public PodcastController(PodcastService podcastService) {
        this.podcastService = podcastService;
    }

    /**
     * Subscribes the caller to a feed, importing the feed's episodes.
     *
     * @param request the feed to subscribe to
     * @param auth    the authenticated caller, whose name is the JWT e-mail claim
     * @return {@code 201} with the new subscription, or {@code 200} when the
     *         caller was already subscribed. The body carries the same
     *         distinction in {@link SubscribeResult#alreadySubscribed()}
     */
    @PostMapping
    public ResponseEntity<SubscribeResult> subscribe(@RequestBody SubscribeRequest request,
                                                     Authentication auth) {
        SubscribeResult result = podcastService.subscribe(auth.getName(), request.feedUrl());
        HttpStatus status = result.alreadySubscribed() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(result);
    }

    /**
     * @param auth the authenticated caller
     * @return the podcasts the caller follows, ordered by title
     */
    @GetMapping
    public List<PodcastSummaryDto> listSubscriptions(Authentication auth) {
        return podcastService.listSubscriptions(auth.getName());
    }

    /**
     * @param id   the podcast whose episodes are wanted
     * @param auth the authenticated caller
     * @return the podcast's episodes, newest first
     */
    @GetMapping("/{id}/episodes")
    public List<EpisodeDto> listEpisodes(@PathVariable long id, Authentication auth) {
        return podcastService.listEpisodes(id, auth.getName());
    }

    /**
     * Re-reads the feed and imports anything new.
     *
     * @param id the podcast to refresh
     * @return the podcast after the refresh, and how many episodes were added
     */
    @PostMapping("/{id}/refresh")
    public RefreshResult refresh(@PathVariable long id) {
        return podcastService.refresh(id);
    }
}
