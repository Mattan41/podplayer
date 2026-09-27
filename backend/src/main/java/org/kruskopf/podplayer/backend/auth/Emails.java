package org.kruskopf.podplayer.backend.auth;

import java.util.Locale;

/**
 * Utility methods for working with e-mail addresses.
 */
public final class Emails {

    private Emails() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * Normalizes an e-mail address so it can be compared against the allowlist.
     *
     * <p>Surrounding whitespace is stripped and the remainder is lower-cased.
     * A {@code null} input is returned as {@code null} rather than throwing, so
     * callers may pass an unresolved value straight through without a null
     * check of their own.</p>
     *
     * @param email the address to normalize, may be {@code null}
     * @return the trimmed, lower-cased address, or {@code null} if the input
     *         was {@code null}
     */
    public static String normalize(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
