package com.imagegallery.service;

import com.imagegallery.exception.ApiException;
import com.imagegallery.exception.ApiException.ErrorType;
import com.imagegallery.model.Image;
import com.imagegallery.repository.ImageRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Calls the Anthropic Vision API to generate a one-sentence description of each uploaded image.
 * Descriptions are stored in {@code images.ai_description} and used by the visual content search
 * feature ({@code GET /api/images?q=rocket}).
 *
 * <p>Image descriptions are queued by {@link #describeAndSave(Long)} and processed by a single
 * background worker thread — guaranteed serialization without fighting Spring's @Async executor
 * resolution. The worker thread processes descriptions one at a time, preventing SQLite lock
 * contention (SQLite allows exactly one writer; multiple concurrent threads cause SQLITE_BUSY
 * errors).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImageDescriptionService {

  private final ImageRepository imageRepository;
  private final StorageService storageService;

  @Value("${ANTHROPIC_API_KEY:}")
  private String apiKey;

  private static final String ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

  /** Video extensions — placeholder thumbnails are useless for vision analysis. */
  private static final Set<String> VIDEO_EXTS =
      Set.of("mp4", "mov", "avi", "mkv", "m4v", "wmv", "webm");

  private final RestClient restClient = RestClient.create();

  // -------------------------------------------------------------------------
  // Worker thread and queue — one thread processes descriptions sequentially
  // -------------------------------------------------------------------------

  private final BlockingQueue<Long> descriptionQueue = new LinkedBlockingQueue<>();
  private Thread workerThread;

  @PostConstruct
  public void startWorker() {
    workerThread =
        new Thread(
            () -> {
              log.info("Image description worker thread started");
              while (!Thread.currentThread().isInterrupted()) {
                try {
                  Long imageId = descriptionQueue.take();
                  processDescription(imageId);
                } catch (InterruptedException e) {
                  log.debug("Image description worker interrupted");
                  Thread.currentThread().interrupt();
                  break;
                }
              }
              log.info("Image description worker thread stopped");
            },
            "image-description-worker");
    workerThread.setDaemon(false); // don't die silently if not explicitly interrupted
    workerThread.start();
  }

  @PreDestroy
  public void stopWorker() {
    if (workerThread != null) {
      workerThread.interrupt();
      try {
        workerThread.join(5000); // wait up to 5s for graceful shutdown
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Queue an image for description processing. Non-blocking — returns immediately. Processing
   * happens asynchronously by the background worker thread, serialized to prevent SQLite lock
   * contention.
   *
   * @param imageId the ID of the image to describe
   */
  public void describeAndSave(Long imageId) {
    descriptionQueue.offer(imageId);
  }

  // -------------------------------------------------------------------------
  // Worker processing
  // -------------------------------------------------------------------------

  /**
   * Process a single image description in the background worker thread. Wrapped in its
   * own @Transactional to ensure DB writes are committed independently.
   */
  @Transactional
  private void processDescription(Long imageId) {
    try {
      Image image = imageRepository.findById(imageId).orElse(null);
      if (image == null || image.getAiDescription() != null) return; // already done

      try {
        String description = buildDescription(image.getFilename());
        if (description == null) {
          // API key not configured — mark as SKIPPED (not an error, just didn't attempt)
          image.setDescriptionStatus("SKIPPED");
          imageRepository.save(image);
          return;
        }
        image.setAiDescription(description);
        image.setDescriptionStatus("SUCCESS");
        imageRepository.save(image);
        log.debug("Described image {} [{}]: {}", imageId, image.getFilename(), description);
      } catch (ApiException e) {
        // Record failure in durable per-image state
        image.setDescriptionStatus("FAILED");
        image.setDescriptionError(e.getErrorType().name());
        imageRepository.save(image);
        log.warn(
            "Failed to describe image {} [{}]: {} ({})",
            imageId,
            image.getFilename(),
            e.getErrorType(),
            e.getMessage());
      }
    } catch (Exception e) {
      log.warn("Failed to process description for image {}: {}", imageId, e.getMessage());
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Returns the count of images that still lack a description. Used by the controller to report how
   * many jobs were queued.
   */
  @Transactional(readOnly = true)
  public int countMissingDescriptions() {
    return imageRepository.findByAiDescriptionIsNull().size();
  }

  /**
   * Decides how to produce a description — vision API for images, filename for videos.
   *
   * @throws ApiException if the vision API call fails
   */
  private String buildDescription(String filename) throws ApiException {
    if (isVideo(filename)) {
      // Placeholder thumbnails contain a play icon, not actual video frames.
      // Use a filename-derived description so "video" is still searchable.
      String base = filename.replaceAll("\\.[^.]+$", "").replace("_", " ").replace("-", " ");
      return "Video: " + base;
    }
    if (apiKey == null || apiKey.isBlank()) {
      log.debug("ANTHROPIC_API_KEY not configured — skipping vision description");
      return null;
    }
    return callVisionApi(filename);
  }

  /**
   * Reads the stored thumbnail, encodes it as base64, and sends it to Claude Haiku for a concise
   * one-sentence visual description.
   *
   * @throws ApiException if the API call fails (auth, quota, network, etc.)
   */
  @SuppressWarnings("unchecked")
  private String callVisionApi(String filename) throws ApiException {
    try (InputStream stream = storageService.retrieveThumbnail(filename)) {
      byte[] thumbBytes = stream.readAllBytes();
      String base64Data = Base64.getEncoder().encodeToString(thumbBytes);
      String mediaType = thumbnailMediaType(filename);

      Map<String, Object> body =
          Map.of(
              "model",
              "claude-haiku-4-5-20251001",
              "max_tokens",
              150,
              "messages",
              List.of(
                  Map.of(
                      "role",
                      "user",
                      "content",
                      List.of(
                          Map.of(
                              "type",
                              "image",
                              "source",
                              Map.of(
                                  "type", "base64",
                                  "media_type", mediaType,
                                  "data", base64Data)),
                          Map.of(
                              "type",
                              "text",
                              "text",
                              "Describe this image in one concise sentence. "
                                  + "Focus on the main subjects, objects, setting, "
                                  + "colors, and notable visual elements. Be specific.")))));

      Map<?, ?> response =
          restClient
              .post()
              .uri(ANTHROPIC_API_URL)
              .header("x-api-key", apiKey)
              .header("anthropic-version", "2023-06-01")
              .contentType(MediaType.APPLICATION_JSON)
              .body(body)
              .retrieve()
              .body(Map.class);

      if (response == null) return null;
      List<?> content = (List<?>) response.get("content");
      if (content == null || content.isEmpty()) return null;
      Map<?, ?> first = (Map<?, ?>) content.get(0);
      return (String) first.get("text");

    } catch (RestClientResponseException e) {
      // Detect specific API errors from Anthropic
      ErrorType errorType =
          classifyApiError(e.getStatusCode().value(), e.getResponseBodyAsString());
      ApiException apiException =
          new ApiException(
              "Vision API request failed: " + errorType, errorType, e.getStatusCode().value(), e);
      log.warn("Vision API call failed for {} [{}]: {}", filename, e.getStatusCode(), errorType);
      throw apiException;
    } catch (Exception e) {
      // Transient errors (network, I/O, etc.)
      ApiException apiException =
          new ApiException(
              "Unable to process image with AI. Please try again.",
              ErrorType.TRANSIENT_ERROR,
              500,
              e);
      log.warn("Vision API call failed for {}: {}", filename, e.getMessage());
      throw apiException;
    }
  }

  /** Classifies an API error based on HTTP status code and response body. */
  private ErrorType classifyApiError(int statusCode, String responseBody) {
    if (statusCode == 401 || statusCode == 403) {
      return ErrorType.AUTHENTICATION_FAILED;
    }
    if (statusCode == 429) {
      return ErrorType.QUOTA_EXCEEDED;
    }
    if (statusCode >= 500) {
      return ErrorType.TRANSIENT_ERROR;
    }
    if (responseBody.contains("overloaded")) {
      return ErrorType.TRANSIENT_ERROR;
    }
    return ErrorType.INVALID_REQUEST;
  }

  /** Returns the media type for a thumbnail based on its filename. */
  private String thumbnailMediaType(String filename) {
    String lower = filename.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }

  private boolean isVideo(String filename) {
    String lower = filename.toLowerCase();
    return VIDEO_EXTS.stream().anyMatch(ext -> lower.endsWith("." + ext));
  }
}
