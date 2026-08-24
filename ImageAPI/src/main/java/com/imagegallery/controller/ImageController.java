package com.imagegallery.controller;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.imagegallery.dto.ImageDto;
import com.imagegallery.dto.ImageGroupDto;
import com.imagegallery.dto.TagDto;
import com.imagegallery.exception.ApiException;
import com.imagegallery.service.ImageDescriptionService;
import com.imagegallery.service.ImageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;
    private final ImageDescriptionService imageDescriptionService;

    @GetMapping
    public ResponseEntity<List<ImageGroupDto>> listImages(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean favourites) {
        // Visual content search takes priority when q is provided
        List<ImageGroupDto> results;
        if (q != null && !q.isBlank()) {
            results = imageService.searchByContent(q);

            // If search returned no results AND there are images with failed descriptions,
            // it likely means the Vision API had issues (quota/auth/etc), not a genuine zero-match.
            // Report the underlying API error instead of "No results found".
            if (results.isEmpty() && imageService.hasFailedDescriptions()) {
                String errorType = imageService.getMostRecentDescriptionErrorType()
                        .orElse("UNKNOWN_ERROR");
                throw ApiException.fromErrorType(ApiException.ErrorType.valueOf(errorType));
            }
        } else {
            results = imageService.getImages(tag, tags, type, favourites);
        }

        // Metadata changes frequently (tags, favorites), so don't cache
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(results);
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<String, Long>> mediaCounts() {
        // Counts change when images are added/removed, so don't cache
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(imageService.getMediaCounts());
    }

    // Images keyed by ID are immutable (delete+reupload always produces a new ID),
    // so a 1-year immutable cache is safe for both thumbnails and full images.
    private static final CacheControl IMAGE_CACHE =
            CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable();

    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<byte[]> getThumbnail(@PathVariable Long id) throws IOException {
        try {
            ImageService.StreamResult result = imageService.getThumbnailStream(id);
            try (InputStream stream = result.stream()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(thumbnailContentTypeFor(result.filename())))
                        .cacheControl(IMAGE_CACHE)
                        .body(stream.readAllBytes());
            }
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/full")
    public ResponseEntity<StreamingResponseBody> getFullImage(@PathVariable Long id) {
        try {
            ImageService.StreamResult result = imageService.getFullImageStream(id);
            StreamingResponseBody body = out -> {
                try (InputStream in = result.stream()) {
                    in.transferTo(out);
                }
            };
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentTypeFor(result.filename())))
                    .cacheControl(IMAGE_CACHE)
                    .body(body);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * MIME type for the original stored file.
     */
    private String contentTypeFor(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
        if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".avi")) return "video/x-msvideo";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
        if (lower.endsWith(".wmv")) return "video/x-ms-wmv";
        if (lower.endsWith(".webm")) return "video/webm";
        return "image/jpeg";
    }

    /**
     * MIME type for the thumbnail (Thumbnailator converts HEIC/etc. to JPEG).
     */
    private String thumbnailContentTypeFor(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    @PatchMapping("/{id}/favourite")
    public ResponseEntity<ImageDto> toggleFavourite(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(imageService.toggleFavourite(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/tags")
    public ResponseEntity<ImageDto> addTag(@PathVariable Long id, @Valid @RequestBody TagDto body) {
        try {
            return ResponseEntity.ok(imageService.addTag(id, body.getTag()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}/tags/{tagName}")
    public ResponseEntity<ImageDto> removeTag(@PathVariable Long id, @PathVariable String tagName) {
        try {
            return ResponseEntity.ok(imageService.removeTag(id, tagName));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteImage(@PathVariable Long id) {
        try {
            imageService.deleteImage(id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Owner-only: queue visual description for every image that doesn't have one.
     * Runs asynchronously — returns immediately with a count of queued jobs.
     * Useful for backfilling descriptions on images uploaded before this feature existed.
     */
    @PostMapping("/describe-all")
    public ResponseEntity<Map<String, Object>> describeAll() {
        List<Long> missing = imageService.getImagesWithoutDescription();
        missing.forEach(imageDescriptionService::describeAndSave);
        return ResponseEntity.accepted()
                .body(Map.of("queued", missing.size(),
                             "message", missing.size() + " images queued for description"));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteImages(@RequestBody List<Long> ids) {
        for (Long id : ids) {
            try {
                imageService.deleteImage(id);
            } catch (NoSuchElementException ignored) {
            }
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file provided");
        }
        try {
            LocalDateTime takenAt = extractExifDate(file.getBytes());
            ImageDto dto = imageService.uploadAndRegister(file, takenAt);
            // Trigger async vision description — runs in background, doesn't delay response
            imageDescriptionService.describeAndSave(dto.getId());
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IOException e) {
            log.error("Upload failed", e);
            return ResponseEntity.internalServerError().body("Upload failed");
        }
    }

    private LocalDateTime extractExifDate(byte[] bytes) {
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
            log.debug("No EXIF date in upload: {}", e.getMessage());
        }
        return null;
    }
}
