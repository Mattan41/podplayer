package org.kruskopf.podplayer.backend.auth;

/**
 * Describes the currently authenticated caller.
 */
public record MeDto(
        String email,
        UserRole role) {
}
