package org.kruskopf.podplayer.backend.podcast;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * One page of a podcast's episode list, plus enough to paginate it.
 *
 * <p>This is a wrapped record rather than Spring Data's {@link Page} for two
 * reasons: {@code Page}'s JSON shape is framework detail (a {@code pageable}
 * object, a {@code sort} object) that a client should not have to read or that
 * a library upgrade could change, and every other response in this API is a
 * plain DTO record. The service maps a {@code Page} onto this shape and nothing
 * of Spring Data crosses the HTTP boundary.</p>
 *
 * @param episodes the episodes on this page, newest first; empty when the
 *                 requested page is past the end
 * @param page     the zero-based page number that was returned
 * @param size     the page size that was requested
 * @param total    how many episodes the podcast has in total, across all pages
 * @param hasMore  whether a page after this one exists; {@code true} while
 *                 {@code (page + 1) * size < total}
 */
public record EpisodePageDto(
        List<EpisodeDto> episodes,
        int page,
        int size,
        long total,
        boolean hasMore) {

    /**
     * Maps a Spring Data page of entities onto the read model.
     *
     * @param source the page of episodes, already ordered newest first
     * @return the equivalent page DTO
     */
    public static EpisodePageDto from(Page<Episode> source) {
        return new EpisodePageDto(
                source.getContent().stream().map(EpisodeDto::from).toList(),
                source.getNumber(),
                source.getSize(),
                source.getTotalElements(),
                source.hasNext());
    }
}
