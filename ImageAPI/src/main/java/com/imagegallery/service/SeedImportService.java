package com.imagegallery.service;

import com.imagegallery.dto.ImageDto;
import com.imagegallery.model.Image;
import com.imagegallery.repository.ImageRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Handles importing seed-pool images into a user's private gallery on first login. Performs
 * server-side copy of both file bytes and metadata (tags, favourite status).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SeedImportService {

  private final ImageRepository imageRepository;
  private final StorageService storageService;
  private final ImageService imageService;

  /**
   * Import seed images into a user's private gallery. Only callable when the user owns zero images
   * (first-login guard). Returns the list of newly-created image copies in the user's gallery.
   */
  public List<ImageDto> importSeedImages(Long ownerId) {
    // Idempotency guard: if user already has images, reject.
    if (imageRepository.existsByOwnerId(ownerId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Gallery already has images");
    }

    // Fetch all seed-sample images (the curated 8)
    List<Image> seeds =
        imageRepository.findByOwnerIdIsNullAndSeedSampleTrueOrderByTakenAtDescIdDesc();
    if (seeds.isEmpty()) {
      log.warn("No seed images found for import");
      return List.of();
    }

    List<ImageDto> result = new ArrayList<>();
    for (Image seed : seeds) {
      try {
        String ext = imageService.extension(seed.getFilename());
        String thumbExt = imageService.thumbnailFormatFor(seed.getFilename());

        // Generate new, collision-proof storage keys for the user's copy
        String newImageKey = imageService.buildStorageKey(ownerId, ext);
        String newThumbKey = imageService.buildStorageKey(ownerId, thumbExt);

        // Determine source keys (with fallback for pre-migration rows)
        String sourceImageKey = seed.getS3Key() != null ? seed.getS3Key() : seed.getFilename();
        String sourceThumbKey =
            seed.getThumbnailKey() != null ? seed.getThumbnailKey() : seed.getFilename();

        // Server-side copy of image and thumbnail
        try {
          storageService.copyImage(sourceImageKey, newImageKey);
          log.debug("Copied image from {} to {}", sourceImageKey, newImageKey);
        } catch (Exception e) {
          log.error("Failed to copy image {}: {}", sourceImageKey, e.getMessage());
          throw e;
        }

        try {
          storageService.copyThumbnail(sourceThumbKey, newThumbKey);
          log.debug("Copied thumbnail from {} to {}", sourceThumbKey, newThumbKey);
        } catch (Exception e) {
          log.error("Failed to copy thumbnail {}: {}", sourceThumbKey, e.getMessage());
          throw e;
        }

        // Create a new Image row in the user's gallery
        Image copy = new Image();
        copy.setOwnerId(ownerId);
        copy.setFilename(seed.getFilename()); // Display filename (per-owner unique now)
        copy.setS3Key(newImageKey); // Collision-proof storage key
        copy.setThumbnailKey(newThumbKey); // Collision-proof thumbnail key
        copy.setTakenAt(seed.getTakenAt());
        copy.setFavourite(seed.isFavourite()); // Preserve favourite flag
        copy.setAiDescription(seed.getAiDescription()); // Reuse AI description (no re-analysis)
        copy.setDescriptionStatus(seed.getDescriptionStatus());
        copy.setDescriptionError(seed.getDescriptionError());
        copy.setSeedSample(false); // User's copy is not itself importable
        copy.setTags(new HashSet<>(seed.getTags())); // Share Tag objects (global vocabulary)

        Image saved = imageRepository.save(copy);
        result.add(new ImageDto(saved));
        log.info(
            "Imported seed image {} ({} -> {}) into user {}'s gallery",
            seed.getFilename(),
            sourceImageKey,
            newImageKey,
            ownerId);
        // Note: AI description already copied from seed
        // (copy.setAiDescription(seed.getAiDescription())),
        // so no need to call describeAndSave() — it would be a no-op due to the getAiDescription()
        // != null check.
      } catch (Exception e) {
        log.warn("Failed to import seed image {}: {}", seed.getFilename(), e.getMessage());
        // Continue with the rest rather than failing the whole import
      }
    }

    log.info("Imported {} of {} seed images for user {}", result.size(), seeds.size(), ownerId);
    return result;
  }
}
