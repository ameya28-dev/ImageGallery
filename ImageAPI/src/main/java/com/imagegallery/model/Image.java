package com.imagegallery.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "images")
@Getter
@Setter
@NoArgsConstructor
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String filename;

    @Column(name = "s3_key", length = 512)
    private String s3Key;

    @Column(name = "taken_at", nullable = false)
    private LocalDateTime takenAt;

    @Column(name = "is_favourite", nullable = false)
    private boolean favourite = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** AI-generated one-sentence description of the image content (null until analysed). */
    @Column(name = "ai_description", columnDefinition = "TEXT")
    private String aiDescription;

    /** Outcome of the last Vision API attempt for this image. Null until first attempt. */
    @Column(name = "description_status", length = 20)
    private String descriptionStatus; // SUCCESS | FAILED | SKIPPED | PENDING

    /** Error type (ApiException.ErrorType name) when descriptionStatus = FAILED. */
    @Column(name = "description_error", length = 40)
    private String descriptionError;

    @ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "image_tags",
        joinColumns = @JoinColumn(name = "image_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();
}
