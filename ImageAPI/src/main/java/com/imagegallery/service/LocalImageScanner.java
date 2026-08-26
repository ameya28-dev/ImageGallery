package com.imagegallery.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.imagegallery.config.GalleryProperties;
import com.imagegallery.repository.ImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Slf4j
@Service
@Profile("local")
@RequiredArgsConstructor
public class LocalImageScanner {

    private static final Set<String> SUPPORTED = Set.of(
            "jpg", "jpeg", "png", "gif", "webp",
            "mp4", "mov", "avi", "mkv", "m4v", "wmv", "webm"
    );
    private static final Set<String> VIDEO_EXTS = Set.of("mp4", "mov", "avi", "mkv", "m4v", "wmv", "webm");

    private final GalleryProperties properties;
    private final ImageService imageService;
    private final ImageRepository imageRepository;
    private final StorageService storageService;
    private final ThumbnailService thumbnailService;
    private final ImageDescriptionService imageDescriptionService;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    public void scanOnStartup() {
        log.info("Scanning images folder on startup...");
        try {
            // Step 1: Copy seed files if gallery is empty
            seedDefaultDataIfEmpty();

            // Step 2: Index all files into database
            scan();

            // Small delay to ensure all database writes from scan() are committed
            Thread.sleep(100);

            // Step 3: Apply metadata (tags, favorites) to seeded images
            applySeedMetadata();

            // Step 4: Backfill AI descriptions (async, sequential)
            backfillMissingDescriptions();

            log.info("Startup scan complete");
        } catch (InterruptedException e) {
            log.warn("Startup scan interrupted");
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Seed default gallery on first run (when gallery is empty).
     * Copies seed images from seed-data/ into the configured images-path.
     * Searches the public seed pool (ownerId = null).
     */
    private void seedDefaultDataIfEmpty() {
        // Check if the public seed pool (ownerId = null) has any images
        var imageCount = imageService.getImages(null, null, null, null, null).stream()
                .flatMap(g -> g.getImages().stream()).count();
        if (imageCount > 0) {
            return; // Seed pool already has data, don't re-seed
        }
        Path seedPath = Paths.get("seed-data/images");
        if (!Files.exists(seedPath)) {
            log.debug("No seed-data/images found, skipping seed");
            return;
        }
        Path galleryPath = Paths.get(properties.getImagesPath());
        try {
            Files.createDirectories(galleryPath);
            try (Stream<Path> seedFiles = Files.list(seedPath)) {
                seedFiles.filter(p -> isSupported(p.getFileName().toString()))
                        .forEach(src -> {
                            try {
                                Path dest = galleryPath.resolve(src.getFileName());
                                if (!Files.exists(dest)) {
                                    Files.copy(src, dest);
                                    log.debug("Seeded: {}", src.getFileName());
                                }
                            } catch (IOException e) {
                                log.warn("Failed to seed {}: {}", src.getFileName(), e.getMessage());
                            }
                        });
            }
            log.info("Seed data copied to images folder");
        } catch (IOException e) {
            log.warn("Failed to seed default data: {}", e.getMessage());
        }
    }

    /**
     * Apply tags and favourite flags from seed-metadata.json to seeded images in the public pool.
     * Only applies to images that exist in the just-scanned gallery.
     * Passes ownerId = null to operate on the public seed pool only.
     */
    private void applySeedMetadata() {
        Path metadataPath = Paths.get("seed-data/seed-metadata.json");
        if (!Files.exists(metadataPath)) {
            return; // No seed metadata to apply
        }
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> entries = objectMapper.readValue(
                    Files.readAllBytes(metadataPath),
                    List.class
            );

            // Fetch all seed-pool images once, then build a filename->image map for efficient lookup
            var allImages = imageService.getImages(null, null, null, null, null).stream()
                    .flatMap(g -> g.getImages().stream())
                    .toList();
            var imagesByFilename = new java.util.HashMap<String, com.imagegallery.dto.ImageDto>();
            for (var image : allImages) {
                imagesByFilename.put(image.getFilename(), image);
            }

            int appliedCount = 0;
            for (Map<String, Object> entry : entries) {
                String filename = (String) entry.get("filename");
                @SuppressWarnings("unchecked")
                List<String> tags = (List<String>) entry.get("tags");
                Boolean favourite = (Boolean) entry.get("favourite");

                try {
                    var image = imagesByFilename.get(filename);
                    if (image == null) {
                        log.debug("Seed image not found after scan: {}", filename);
                        continue;
                    }

                    // Apply tags via owner-scoped service method (ownerId = null for public pool)
                    if (tags != null && !tags.isEmpty()) {
                        for (String tag : tags) {
                            imageService.addTag(null, image.getId(), tag);
                        }
                    }

                    // Apply favourite flag
                    if (favourite != null && favourite && !image.isFavourite()) {
                        imageService.toggleFavourite(null, image.getId());
                    }

                    appliedCount++;
                    log.debug("Seeded metadata for {}: {} tags, favourite={}", filename, tags == null ? 0 : tags.size(), favourite);
                } catch (Exception e) {
                    log.warn("Failed to apply seed metadata to {}: {}", filename, e.getMessage());
                }
            }
            log.info("Seed metadata applied to {} of {} images", appliedCount, entries.size());
        } catch (IOException e) {
            log.warn("Failed to read seed metadata: {}", e.getMessage());
        }
    }

    /** Backfill descriptions for seed-pool images that don't have one yet (async, serialized by single-threaded executor). */
    private void backfillMissingDescriptions() {
        // Get missing descriptions for the seed pool only (ownerId = null)
        var missingIds = imageService.getImagesWithoutDescription(null);
        if (missingIds.isEmpty()) return;
        log.info("Backfilling descriptions for {} seed-pool images without descriptions (async)", missingIds.size());
        // Fire async tasks — they're serialized by AsyncConfig's single-threaded executor, no manual staggering needed.
        for (long imageId : missingIds) {
            imageDescriptionService.describeAndSave(imageId);
        }
    }

    public void scan() {
        Path folder = Paths.get(properties.getImagesPath());
        if (!Files.exists(folder)) {
            log.warn("Images folder not found: {}", folder.toAbsolutePath());
            return;
        }
        try (Stream<Path> files = Files.list(folder)) {
            files.filter(p -> isSupported(p.getFileName().toString()))
                    .forEach(this::indexFile);
        } catch (IOException e) {
            log.error("Error scanning images folder", e);
        }
    }

    private void indexFile(Path path) {
        String filename = path.getFileName().toString();
        // For filesystem-scanned images, use the original filename as the storage key
        // (files are already on disk with those names from seedDefaultDataIfEmpty).
        // Collision-proof keys only apply to NEW uploads via the REST API.
        try {
            // Skip if this image is already in the database (for the guest/seed pool, ownerId=null)
            if (imageRepository.existsByOwnerIdAndFilename(null, filename)) {
                log.debug("Already indexed: {}", filename);
                return;
            }

            byte[] thumbBytes;
            LocalDateTime takenAt;
            String thumbExt = imageService.thumbnailFormatFor(filename);

            if (isVideoFile(filename)) {
                takenAt = fileLastModified(path);
                try (InputStream thumb = thumbnailService.generateVideoPlaceholder()) {
                    thumbBytes = thumb.readAllBytes();
                }
            } else {
                byte[] bytes = Files.readAllBytes(path);
                takenAt = extractExifDate(bytes, filename, fileLastModified(path));
                String format = imageService.thumbnailFormatFor(filename);
                try (InputStream thumb = thumbnailService.generateThumbnail(new ByteArrayInputStream(bytes), format)) {
                    thumbBytes = thumb.readAllBytes();
                }
            }

            // For scanned images, store thumbnail with filename as key (no collision risk for seed images)
            storageService.storeThumbnail(filename, new ByteArrayInputStream(thumbBytes), thumbBytes.length);
            // Register with original filename as both s3Key and thumbnailKey (already on disk with this name)
            var image = imageService.registerScannedImage(filename, filename, filename, takenAt);
            // Hook new scanned images into the description pipeline (async, non-blocking)
            imageDescriptionService.describeAndSave(image.getId());
            log.info("Indexed: {}", filename);
        } catch (Exception e) {
            log.warn("Skipping {} — {}", filename, e.getMessage());
        }
    }


    private LocalDateTime extractExifDate(byte[] bytes, String filename, LocalDateTime fallback) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(bytes));
            ExifSubIFDDirectory dir = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (dir != null) {
                Date date = dir.getDate(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
                if (date != null) {
                    return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
                }
            }
        } catch (ImageProcessingException | IOException e) {
            log.debug("No EXIF date for {}: {}", filename, e.getMessage());
        }
        return fallback;
    }

    private LocalDateTime fileLastModified(Path path) {
        try {
            return Files.getLastModifiedTime(path).toInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDateTime();
        } catch (IOException e) {
            return LocalDateTime.now();
        }
    }

    private boolean isSupported(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && SUPPORTED.contains(filename.substring(dot + 1).toLowerCase());
    }

    private boolean isVideoFile(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && VIDEO_EXTS.contains(filename.substring(dot + 1).toLowerCase());
    }
}
