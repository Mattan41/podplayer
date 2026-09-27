package org.kruskopf.podplayer.backend.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Resolves the role granted to an e-mail address from the database-backed
 * allowlist.
 *
 * <p>Lookups are cached in the {@code whitelist} cache so that a role is not
 * read from the database on every authenticated request. Entries expire after
 * 60 seconds; see {@code application.yaml}.</p>
 */
@Service
public class WhitelistService {

    private final AllowedUserRepository allowedUserRepository;

    public WhitelistService(AllowedUserRepository allowedUserRepository) {
        this.allowedUserRepository = allowedUserRepository;
    }

    /**
     * Looks up the role granted to the given e-mail address, ignoring entries
     * that have already expired.
     *
     * @param email the e-mail address to look up
     * @return the granted role, or an empty {@link Optional} when the address
     *         is not allowlisted or its entry has expired
     */
    @Cacheable(value = "whitelist",
               key = "T(org.kruskopf.podplayer.backend.auth.Emails).normalize(#email)",
               condition = "#email != null")
    public Optional<UserRole> lookup(String email) {
        String normalized = Emails.normalize(email);
        if (normalized == null) {
            return Optional.empty();
        }
        Instant now = Instant.now();
        return allowedUserRepository.findByEmail(normalized)
                .filter(user -> user.getExpiresAt() == null || user.getExpiresAt().isAfter(now))
                .map(AllowedUser::getRole);
    }

    /**
     * @param email the e-mail address to check
     * @return {@code true} if the address is allowlisted and not expired
     */
    public boolean isAllowed(String email) {
        return lookup(email).isPresent();
    }

    /**
     * @param email the e-mail address to check
     * @return {@code true} if the address is allowlisted with the ADMIN role
     */
    public boolean isAdmin(String email) {
        return lookup(email).map(role -> role == UserRole.ADMIN).orElse(false);
    }

    /**
     * Discards the cached lookup for the given e-mail address so that the next
     * lookup reads the current database state.
     *
     * @param email the e-mail address whose cached result should be dropped
     */
    @CacheEvict(value = "whitelist", key = "T(org.kruskopf.podplayer.backend.auth.Emails).normalize(#email)")
    public void invalidate(String email) {
        // Intentionally empty: the annotation performs the cache eviction.
    }
}
