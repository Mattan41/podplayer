package org.kruskopf.podplayer.backend.podcast;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A single item of a podcast feed.
 *
 * <p>The mapping mirrors the {@code episode} table created by
 * {@code V2__create_podcast_tables.sql}. An episode is unique within its
 * podcast by {@code guid}, which is the identifier the feed itself assigns;
 * {@code guid} is only guaranteed to be unique per feed, never globally.</p>
 *
 * <p>The owning podcast is held as a plain {@code podcastId} column rather
 * than an {@code @ManyToOne} association. Ingestion and playback both work
 * with identifiers, the database already enforces the foreign key and the
 * cascade, and a plain column keeps this package free of lazy-loading
 * surprises now that {@code open-in-view} is disabled. Association mappings
 * can be introduced later if a caller ever needs to navigate the graph.</p>
 *
 * <p>{@code publishedAt} and {@code durationSeconds} are {@code null} when the
 * feed omits them. Every timestamp column is {@code TIMESTAMPTZ} in PostgreSQL
 * and is therefore represented as an {@link Instant}.</p>
 */
@Entity
@Table(name = "episode")
public class Episode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "podcast_id", nullable = false)
    private Long podcastId;

    @Column(nullable = false)
    private String guid;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "audio_url", nullable = false)
    private String audioUrl;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "image_url")
    private String imageUrl;

    public Episode() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPodcastId() {
        return podcastId;
    }

    public void setPodcastId(Long podcastId) {
        this.podcastId = podcastId;
    }

    public String getGuid() {
        return guid;
    }

    public void setGuid(String guid) {
        this.guid = guid;
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

    public String getAudioUrl() {
        return audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
