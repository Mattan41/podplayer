package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A podcast feed the backend knows about.
 *
 * <p>The mapping mirrors the {@code podcast} table created by
 * {@code V2__create_podcast_tables.sql}. {@code feedUrl} is the natural key of
 * a feed and is unique, while {@code id} is a surrogate key so that episodes
 * can reference the podcast cheaply.</p>
 *
 * <p>{@code lastFetchedAt} records the most recent successful ingestion and is
 * {@code null} until Phase B fetches the feed for the first time. Every
 * timestamp column is {@code TIMESTAMPTZ} in PostgreSQL and is therefore
 * represented as an {@link Instant}.</p>
 */
@Entity
@Table(name = "podcast")
public class Podcast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feed_url", nullable = false, unique = true)
    private String feedUrl;

    @Column(nullable = false)
    private String title;

    private String description;

    private String author;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "last_fetched_at")
    private Instant lastFetchedAt;

    public Podcast() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFeedUrl() {
        return feedUrl;
    }

    public void setFeedUrl(String feedUrl) {
        this.feedUrl = feedUrl;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Instant getLastFetchedAt() {
        return lastFetchedAt;
    }

    public void setLastFetchedAt(Instant lastFetchedAt) {
        this.lastFetchedAt = lastFetchedAt;
    }
}
