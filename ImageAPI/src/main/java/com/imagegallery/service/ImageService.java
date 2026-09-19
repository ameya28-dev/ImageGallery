package com.imagegallery.service;

import com.imagegallery.dto.ImageDto;
import com.imagegallery.dto.ImageGroupDto;
import com.imagegallery.model.Image;
import com.imagegallery.model.Tag;
import com.imagegallery.repository.ImageRepository;
import com.imagegallery.repository.TagRepository;
import java.io.*;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageService {

  private final ImageRepository imageRepository;
  private final TagRepository tagRepository;
  private final StorageService storageService;
  private final ThumbnailService thumbnailService;
  private final VideoService videoService;

  private static final Map<String, String> EXT_TO_MEDIA_TYPE =
      Map.ofEntries(
          Map.entry("gif", "GIF"),
          Map.entry("webp", "WEBP"),
          Map.entry("mp4", "Video"),
          Map.entry("mov", "Video"),
          Map.entry("avi", "Video"),
          Map.entry("mkv", "Video"),
          Map.entry("m4v", "Video"),
          Map.entry("wmv", "Video"),
          Map.entry("webm", "Video"));
  private static final Set<String> IMAGE_EXTS = Set.of("jpg", "jpeg", "png");

  /**
   * Builds an owner-namespaced, collision-proof storage key. Format:
   * {ownerId|"public"}/{uuid}.{ext}
   */
  public String buildStorageKey(Long ownerId, String extension) {
    String segment = ownerId != null ? String.valueOf(ownerId) : "public";
    String uuid = UUID.randomUUID().toString();
    return segment + "/" + uuid + (extension.isEmpty() ? "" : "." + extension);
  }

  @Transactional(readOnly = true)
  public List<ImageGroupDto> getImages(
      Long ownerId, String tag, List<String> tags, String type, Boolean favouritesOnly) {
    List<Image> images;
    if (Boolean.TRUE.equals(favouritesOnly)) {
      images = new ArrayList<>(imageRepository.findFavouritesForOwner(ownerId));
    } else if (tag != null && !tag.isBlank()) {
      images = new ArrayList<>(imageRepository.findByTagNameForOwner(ownerId, tag.toLowerCase()));
    } else {
      images = new ArrayList<>(imageRepository.findAllForOwnerOrderByTakenAtDesc(ownerId));
    }

    if (tags != null && !tags.isEmpty()) {
      Set<String> wanted = tags.stream().map(String::toLowerCase).collect(Collectors.toSet());
      images =
          images.stream()
              .filter(
                  img ->
                      img.getTags().stream()
                          .map(t -> t.getName().toLowerCase())
                          .collect(Collectors.toSet())
                          .containsAll(wanted))
              .collect(Collectors.toList());
    }

    if (type != null && !type.isBlank()) {
      images =
          images.stream()
              .filter(img -> type.equalsIgnoreCase(mediaType(img.getFilename())))
              .collect(Collectors.toList());
    }

    return groupByDate(images);
  }

  public Map<String, Long> getMediaCounts(Long ownerId) {
    return imageRepository.findAllForOwnerOrderByTakenAtDesc(ownerId).stream()
        .map(img -> mediaType(img.getFilename()))
        .filter(Objects::nonNull)
        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
  }

  private String mediaType(String filename) {
    String ext = extension(filename);
    return EXT_TO_MEDIA_TYPE.getOrDefault(ext, IMAGE_EXTS.contains(ext) ? null : ext.toUpperCase());
  }

  public String extension(String filename) {
    int i = filename.lastIndexOf('.');
    return i >= 0 ? filename.substring(i + 1).toLowerCase() : "";
  }

  public String thumbnailFormatFor(String filename) {
    return thumbnailFormat(filename);
  }

  public boolean isVideo(String filename) {
    return "Video".equals(EXT_TO_MEDIA_TYPE.get(extension(filename)));
  }

  /**
   * Visual content search — queries AI description, tag names, and filename. Results are ranked:
   * description matches first, tag matches second, filename last. Only images owned by the caller
   * are searched.
   */
  @Transactional(readOnly = true)
  public List<ImageGroupDto> searchByContent(Long ownerId, String q) {
    if (q == null || q.isBlank()) return List.of();

    Set<Long> seen = new LinkedHashSet<>();
    List<Image> results = new ArrayList<>();

    for (Image img : imageRepository.findByAiDescriptionForOwner(ownerId, q)) {
      if (seen.add(img.getId())) results.add(img);
    }
    for (Image img : imageRepository.findByFilenameForOwner(ownerId, q)) {
      if (seen.add(img.getId())) results.add(img);
    }
    // Tag search via prefix matching (as before, but owner-scoped)
    String pattern = "%" + q.toLowerCase() + "%";
    List<String> matchingTags =
        imageRepository.findTagNamesByPrefixForOwner(ownerId, pattern.replaceAll("%", ""));
    for (String tagName : matchingTags) {
      for (Image img : imageRepository.findByTagNameForOwner(ownerId, tagName)) {
        if (seen.add(img.getId())) results.add(img);
      }
    }

    results.sort(Comparator.comparing(Image::getTakenAt).reversed());
    return groupByDate(results);
  }

  /**
   * Returns IDs of images (owned by the caller) that have not yet received a visual description.
   */
  @Transactional(readOnly = true)
  public List<Long> getImagesWithoutDescription(Long ownerId) {
    return imageRepository.findWithoutDescriptionForOwner(ownerId).stream()
        .map(Image::getId)
        .toList();
  }

  /** True if any image (owned by the caller) failed Vision analysis due to an API error. */
  @Transactional(readOnly = true)
  public boolean hasFailedDescriptions(Long ownerId) {
    return !imageRepository.findByDescriptionStatusForOwner(ownerId, "FAILED").isEmpty();
  }

  /** Returns the first failure's error type among caller's FAILED images, for messaging. */
  @Transactional(readOnly = true)
  public Optional<String> getMostRecentDescriptionErrorType(Long ownerId) {
    return imageRepository.findByDescriptionStatusForOwner(ownerId, "FAILED").stream()
        .map(Image::getDescriptionError)
        .filter(Objects::nonNull)
        .findFirst();
  }

  private List<ImageGroupDto> groupByDate(List<Image> images) {
    LinkedHashMap<String, List<ImageDto>> grouped = new LinkedHashMap<>();
    for (Image image : images) {
      String date = image.getTakenAt().toLocalDate().toString();
      grouped.computeIfAbsent(date, k -> new ArrayList<>()).add(new ImageDto(image));
    }
    return grouped.entrySet().stream()
        .map(e -> new ImageGroupDto(e.getKey(), e.getValue()))
        .toList();
  }

  /**
   * Fetch image by ID, verifying it belongs to the caller (or is in the public seed pool if caller
   * is guest). Deliberately throws not-found (404) on owner mismatch to avoid leaking other users'
   * image IDs.
   */
  public Image getById(Long ownerId, Long id) {
    Image image =
        imageRepository
            .findById(id)
            .orElseThrow(() -> new NoSuchElementException("Image not found: " + id));
    if (!Objects.equals(image.getOwnerId(), ownerId)) {
      throw new NoSuchElementException("Image not found: " + id);
    }
    return image;
  }

  /** Pairs an open InputStream with the original filename and last-modified timestamp. */
  public record StreamResult(InputStream stream, String filename, Instant lastModified) {}

  public StreamResult getFullImageStream(Long ownerId, Long id) {
    Image image = getById(ownerId, id);
    String storageKey = image.getS3Key() != null ? image.getS3Key() : image.getFilename();
    return new StreamResult(
        storageService.retrieveImage(storageKey),
        image.getFilename(),
        storageService.getImageLastModified(storageKey));
  }

  public StreamResult getThumbnailStream(Long ownerId, Long id) {
    Image image = getById(ownerId, id);
    // Use thumbnailKey if available; fall back to filename for pre-migration rows.
    String thumbKey =
        image.getThumbnailKey() != null ? image.getThumbnailKey() : image.getFilename();
    return new StreamResult(
        storageService.retrieveThumbnail(thumbKey),
        image.getFilename(),
        storageService.getThumbnailLastModified(thumbKey));
  }

  /**
   * Get thumbnail stream without ownership check — thumbnails are always public. Used by the public
   * endpoint that doesn't require authentication.
   */
  @Transactional(readOnly = true)
  public StreamResult getThumbnailStreamPublic(Long id) {
    Image image =
        imageRepository
            .findById(id)
            .orElseThrow(() -> new NoSuchElementException("Image not found: " + id));
    // Use thumbnailKey if available; fall back to filename for pre-migration rows.
    String thumbKey =
        image.getThumbnailKey() != null ? image.getThumbnailKey() : image.getFilename();
    return new StreamResult(
        storageService.retrieveThumbnail(thumbKey),
        image.getFilename(),
        storageService.getThumbnailLastModified(thumbKey));
  }

  @Transactional
  public ImageDto toggleFavourite(Long ownerId, Long id) {
    Image image = getById(ownerId, id);
    image.setFavourite(!image.isFavourite());
    return new ImageDto(imageRepository.save(image));
  }

  @Transactional
  public ImageDto addTag(Long ownerId, Long imageId, String tagName) {
    Image image = getById(ownerId, imageId);
    Tag tag =
        tagRepository.findByName(tagName).orElseGet(() -> tagRepository.save(new Tag(tagName)));
    image.getTags().add(tag);
    return new ImageDto(imageRepository.save(image));
  }

  @Transactional
  public ImageDto removeTag(Long ownerId, Long imageId, String tagName) {
    Image image = getById(ownerId, imageId);
    image.getTags().removeIf(t -> t.getName().equals(tagName));
    ImageDto result = new ImageDto(imageRepository.save(image));
    imageRepository.flush();
    tagRepository
        .findByName(tagName)
        .ifPresent(
            tag -> {
              if (tag.getImages().isEmpty()) tagRepository.delete(tag);
            });
    return result;
  }

  /**
   * Upload and register an image for the caller. Assigns ownerId, generates collision-proof storage
   * keys, checks per-owner filename uniqueness.
   */
  @Transactional
  public ImageDto uploadAndRegister(Long ownerId, MultipartFile file, LocalDateTime takenAt)
      throws IOException {
    String filename = sanitizeFilename(Objects.requireNonNull(file.getOriginalFilename()));
    if (imageRepository.existsByOwnerIdAndFilename(ownerId, filename)) {
      throw new IllegalArgumentException("Image already exists: " + filename);
    }

    String ext = extension(filename);
    String imageKey = buildStorageKey(ownerId, ext);
    String thumbExt = thumbnailFormat(filename);
    String thumbKey = buildStorageKey(ownerId, thumbExt);

    byte[] thumbBytes;
    Double videoDuration = null;

    if (isVideo(filename)) {
      // Create temporary file for video processing
      File tempVideo = File.createTempFile("video-", "." + ext);
      try {
        // Write uploaded video to temp file
        file.transferTo(tempVideo);

        // Extract duration and generate thumbnail with first frame
        try {
          videoDuration = videoService.getVideoDuration(tempVideo);
          try (InputStream t = thumbnailService.generateVideoThumbnail(tempVideo, videoDuration)) {
            thumbBytes = t.readAllBytes();
          }
        } catch (Exception e) {
          log.warn("Failed to process video {}: {}", filename, e.getMessage());
          // Fallback to placeholder if processing fails
          try (InputStream t = thumbnailService.generateVideoPlaceholder()) {
            thumbBytes = t.readAllBytes();
          }
        }

        // Store the video file
        try (InputStream videoStream = new java.io.FileInputStream(tempVideo)) {
          storageService.storeImage(
              imageKey, videoStream, tempVideo.length(), file.getContentType());
        }
      } finally {
        if (!tempVideo.delete()) {
          log.warn("Failed to delete temporary video file: {}", tempVideo);
        }
      }
    } else {
      byte[] bytes = file.getBytes();
      String format = thumbnailFormat(filename);
      try (InputStream t =
          thumbnailService.generateThumbnail(new ByteArrayInputStream(bytes), format)) {
        thumbBytes = t.readAllBytes();
      }
      storageService.storeImage(
          imageKey, new ByteArrayInputStream(bytes), bytes.length, file.getContentType());
    }

    storageService.storeThumbnail(
        thumbKey, new ByteArrayInputStream(thumbBytes), thumbBytes.length);

    Image image = new Image();
    image.setOwnerId(ownerId);
    image.setFilename(filename);
    image.setS3Key(imageKey);
    image.setThumbnailKey(thumbKey);
    image.setTakenAt(takenAt != null ? takenAt : LocalDateTime.now());
    if (videoDuration != null && videoDuration > 0) {
      image.setVideoDuration(videoDuration);
    }
    return new ImageDto(imageRepository.save(image));
  }

  @Transactional
  public void deleteImage(Long ownerId, Long id) {
    Image image = getById(ownerId, id);
    List<Tag> tags = new ArrayList<>(image.getTags());
    String storageKey = image.getS3Key() != null ? image.getS3Key() : image.getFilename();
    String thumbKey =
        image.getThumbnailKey() != null ? image.getThumbnailKey() : image.getFilename();
    storageService.deleteImage(storageKey, thumbKey);
    imageRepository.delete(image);
    imageRepository.flush();
    tags.forEach(
        tag -> {
          if (tag.getImages().isEmpty()) tagRepository.delete(tag);
        });
  }

  /**
   * Registers an image from the scanner (LocalImageScanner only). Hardcodes ownerId = null (public
   * seed pool) and seedSample = true.
   */
  @Transactional
  public Image registerScannedImage(
      String filename, String storageKey, String thumbnailKey, LocalDateTime takenAt) {
    Image image = new Image();
    image.setOwnerId(null); // Public seed pool
    image.setFilename(filename);
    image.setS3Key(storageKey);
    image.setThumbnailKey(thumbnailKey);
    image.setTakenAt(takenAt);
    image.setSeedSample(true); // Mark as seed image
    return imageRepository.save(image);
  }

  private String thumbnailFormat(String filename) {
    String lower = filename.toLowerCase();
    if (lower.endsWith(".png")) return "png";
    if (lower.endsWith(".gif")) return "gif";
    // WebP: Java's ImageIO doesn't support writing webp, so convert to jpeg for thumbnails
    // (WebP source images can still be viewed directly, just thumbnails are jpeg)
    if (lower.endsWith(".webp")) return "jpeg";
    return "jpeg";
  }

  public String sanitizeFilename(String original) {
    return Paths.get(original).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
  }
}
