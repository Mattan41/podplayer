package org.kruskopf.podplayer.backend.auth;

import java.time.Instant;

/**
 * Read model of a single allowlist entry. Keeps the JPA entity out of the HTTP
 * layer.
 */
public record AllowedUserDto(
        String email,
        UserRole role,
        String note,
        Instant expiresAt,
        Instant createdAt,
        String createdBy) {

    /**
     * Maps a persisted entity onto its read model.
     *
     * @param user the entity to map
     * @return the equivalent DTO
     */
    public static AllowedUserDto from(AllowedUser user) {
        return new AllowedUserDto(
                user.getEmail(),
                user.getRole(),
                user.getNote(),
                user.getExpiresAt(),
                user.getCreatedAt(),
                user.getCreatedBy());
    }
}
