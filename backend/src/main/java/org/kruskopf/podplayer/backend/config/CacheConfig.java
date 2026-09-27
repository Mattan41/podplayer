package org.kruskopf.podplayer.backend.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Enables Spring's caching abstraction. The cache provider (Caffeine) and the
 * per-cache settings are declared in {@code application.yaml}.
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
