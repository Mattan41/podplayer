package org.kruskopf.podplayer.backend.auth;

import java.util.List;
import java.util.Objects;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Administrative management of the user allowlist. Reaching any endpoint here
 * requires the {@code ROLE_ADMIN} authority, as enforced by
 * {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AllowedUserRepository allowedUserRepository;
    private final WhitelistService whitelistService;

    public AdminUserController(AllowedUserRepository allowedUserRepository,
                               WhitelistService whitelistService) {
        this.allowedUserRepository = allowedUserRepository;
        this.whitelistService = whitelistService;
    }

    /**
     * @return every allowlist entry, ordered by e-mail address
     */
    @GetMapping
    public List<AllowedUserDto> list() {
        return allowedUserRepository.findAll(Sort.by(Sort.Direction.ASC, "email"))
                .stream()
                .map(AllowedUserDto::from)
                .toList();
    }

    /**
     * Creates the entry if it is missing, otherwise updates it in place. The
     * original {@code createdBy} and {@code createdAt} values are preserved for
     * existing entries.
     *
     * @param request the desired state of the entry
     * @param auth the authenticated administrator performing the change
     * @return the stored entry
     */
    @PostMapping
    public AllowedUserDto upsert(@RequestBody UpsertUserRequest request, Authentication auth) {
        String email = Emails.normalize(request.email());
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email must not be blank");
        }
        if (request.role() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must not be null");
        }
        String currentUser = Emails.normalize(auth.getName());
        if ((currentUser == null || Objects.equals(email, currentUser))
                && request.role() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot demote yourself");
        }

        AllowedUser user = allowedUserRepository.findById(email)
                .orElseGet(() -> {
                    AllowedUser created = new AllowedUser();
                    created.setEmail(email);
                    created.setCreatedBy(auth.getName());
                    return created;
                });

        user.setRole(request.role());
        user.setNote(request.note());
        user.setExpiresAt(request.expiresAt());

        AllowedUser saved = allowedUserRepository.save(user);
        whitelistService.invalidate(email);
        return AllowedUserDto.from(saved);
    }

    /**
     * Removes an entry from the allowlist.
     *
     * @param email the e-mail address to remove
     * @param auth the authenticated administrator performing the change
     */
    @DeleteMapping("/{email}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String email, Authentication auth) {
        String normalized = Emails.normalize(email);
        String currentUser = Emails.normalize(auth.getName());
        if (normalized == null || currentUser == null || Objects.equals(normalized, currentUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete yourself");
        }

        allowedUserRepository.deleteById(normalized);
        whitelistService.invalidate(normalized);
    }
}
