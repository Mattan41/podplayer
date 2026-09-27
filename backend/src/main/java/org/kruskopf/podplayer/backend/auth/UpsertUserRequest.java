package org.kruskopf.podplayer.backend.auth;

import java.time.Instant;

/**
 * Write model for creating or updating an allowlist entry. The {@code note} and
 * {@code expiresAt} fields are optional and may be {@code null}.
 */
public record UpsertUserRequest(
        String email,
        UserRole role,
        String note,
        Instant expiresAt) {
}
