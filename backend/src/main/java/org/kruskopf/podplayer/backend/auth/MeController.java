package org.kruskopf.podplayer.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exposes the identity and role of the authenticated caller.
 */
@RestController
public class MeController {

    private final WhitelistService whitelistService;

    public MeController(WhitelistService whitelistService) {
        this.whitelistService = whitelistService;
    }

    /**
     * @param auth the authenticated caller, whose name is the JWT e-mail claim
     * @return the caller's e-mail address and allowlisted role
     */
    @GetMapping("/api/me")
    public MeDto me(Authentication auth) {
        String email = auth.getName();
        UserRole role = whitelistService.lookup(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not whitelisted"));
        return new MeDto(email, role);
    }
}
