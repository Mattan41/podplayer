package org.kruskopf.podplayer.backend;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness endpoint used by the frontend to warm a cold Cloud Run instance.
 *
 * <p>Deliberately minimal: no dependencies, no database access, no security
 * annotation. It lives outside {@code /api/**}, so {@code SecurityConfig}
 * permits it through its existing {@code anyRequest().permitAll()} rule and no
 * configuration change is needed. Because it touches nothing, it answers in
 * milliseconds once the JVM is warm; when the container is cold, waking it is
 * the whole point of the request. See {@code docs/DECISIONS.md} entry 20.</p>
 */
@RestController
public class HealthController {

    /**
     * @return a constant body confirming the application context is serving
     */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
