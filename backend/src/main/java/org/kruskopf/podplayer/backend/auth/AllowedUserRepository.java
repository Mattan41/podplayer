package org.kruskopf.podplayer.backend.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AllowedUserRepository extends JpaRepository<AllowedUser, String> {

    Optional<AllowedUser> findByEmail(String email);
}
