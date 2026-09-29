package org.kruskopf.podplayer.backend.config;

import java.util.List;

import org.kruskopf.podplayer.backend.auth.UserRole;
import org.kruskopf.podplayer.backend.auth.WhitelistService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Verifies the JWTs issued by Supabase and maps the {@code email} claim onto a
 * role taken from the database-backed allowlist.
 *
 * <p>Authentication happens at Supabase; this backend only verifies the token
 * signature against the Supabase JWKS endpoint. There is deliberately no login
 * endpoint.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final WhitelistService whitelistService;
    private final String jwksUri;

    public SecurityConfig(WhitelistService whitelistService,
                          @Value("${supabase.jwks-uri}") String jwksUri) {
        this.whitelistService = whitelistService;
        this.jwksUri = jwksUri;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter())));
        return http.build();
    }

    /**
     * Supabase signs its JWTs with ES256 (ECC P-256) and publishes only those
     * keys in its JWKS. {@code withJwkSetUri} alone defaults to RS256, which
     * rejects every ES256 token, so the algorithm is set explicitly here.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri(jwksUri)
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .build();
    }

    /**
     * Maps the {@code email} claim onto the role stored in the allowlist,
     * rejecting tokens whose address is not (or is no longer) whitelisted.
     */
    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthConverter() {
        return jwt -> {
            String email = jwt.getClaimAsString("email");
            if (email == null || email.isBlank()) {
                throw new BadCredentialsException("JWT missing email claim");
            }
            UserRole role = whitelistService.lookup(email)
                    .orElseThrow(() -> new BadCredentialsException("Not whitelisted: " + email));
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role.name());
            return new JwtAuthenticationToken(jwt, List.of(authority), email);
        };
    }
}
