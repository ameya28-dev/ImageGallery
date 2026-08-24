package com.imagegallery.service;

import com.imagegallery.exception.ApiException;
import com.imagegallery.exception.ApiException.ErrorType;
import com.imagegallery.model.Image;
import com.imagegallery.repository.ImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Objects;

/**
 * Calls the Anthropic Vision API to generate a one-sentence description of each
 * uploaded image. Descriptions are stored in {@code images.ai_description} and
 * used by the visual content search feature ({@code GET /api/images?q=rocket}).
 *
 * <p>The {@link #describeAndSave(Long)} method is {@code @Async} — it runs in a
 * background thread and never blocks the HTTP upload response.
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
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Asynchronously describe a single image and persist the result.
     * Safe to call immediately after {@code uploadAndRegister} — runs in a
     * separate thread after the upload transaction has committed.
     *
     * Sets descriptionStatus to SUCCESS/FAILED/SKIPPED so search logic can
     * accurately report why a query returned no results.
     */
    @Async
    @Transactional
    public void describeAndSave(Long imageId) {
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
                log.warn("Failed to describe image {} [{}]: {} ({})", imageId, image.getFilename(), e.getErrorType(), e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Failed to describe image {}: {}", imageId, e.getMessage());
        }
    }

    /**
     * Returns the count of images that still lack a description.
     * Used by the controller to report how many jobs were queued.
     */
    @Transactional(readOnly = true)
    public int countMissingDescriptions() {
        return imageRepository.findByAiDescriptionIsNull().size();
    }


    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Decides how to produce a description — vision API for images, filename for videos.
     *
     * @throws ApiException if the vision API call fails
     */
    private String buildDescription(String filename) throws ApiException {
        if (isVideo(filename)) {
            // Placeholder thumbnails contain a play icon, not actual video frames.
            // Use a filename-derived description so "video" is still searchable.
            String base = filename.replaceAll("\\.[^.]+$", "")
                                  .replace("_", " ")
                                  .replace("-", " ");
            return "Video: " + base;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("ANTHROPIC_API_KEY not configured — skipping vision description");
            return null;
        }
        return callVisionApi(filename);
    }

    /**
     * Reads the stored thumbnail, encodes it as base64, and sends it to Claude
     * Haiku for a concise one-sentence visual description.
     *
     * @throws ApiException if the API call fails (auth, quota, network, etc.)
     */
    @SuppressWarnings("unchecked")
    private String callVisionApi(String filename) throws ApiException {
        try (InputStream stream = storageService.retrieveThumbnail(filename)) {
            byte[] thumbBytes = stream.readAllBytes();
            String base64Data = Base64.getEncoder().encodeToString(thumbBytes);
            String mediaType  = thumbnailMediaType(filename);

            Map<String, Object> body = Map.of(
                    "model",      "claude-haiku-4-5-20251001",
                    "max_tokens", 150,
                    "messages",   List.of(Map.of(
                            "role", "user",
                            "content", List.of(
                                    Map.of(
                                            "type",   "image",
                                            "source", Map.of(
                                                    "type",       "base64",
                                                    "media_type", mediaType,
                                                    "data",       base64Data
                                            )
                                    ),
                                    Map.of(
                                            "type", "text",
                                            "text", "Describe this image in one concise sentence. "
                                                    + "Focus on the main subjects, objects, setting, "
                                                    + "colors, and notable visual elements. Be specific."
                                    )
                            )
                    ))
            );

            Map<?, ?> response = restClient.post()
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
            ErrorType errorType = classifyApiError(e.getStatusCode().value(), e.getResponseBodyAsString());
            ApiException apiException = new ApiException(
                    formatErrorMessage(errorType),
                    errorType,
                    e.getStatusCode().value(),
                    e
            );
            log.warn("Vision API call failed for {} [{}]: {}", filename, e.getStatusCode(), errorType);
            throw apiException;
        } catch (Exception e) {
            // Transient errors (network, I/O, etc.)
            ApiException apiException = new ApiException(
                    "Unable to process image with AI. Please try again.",
                    ErrorType.TRANSIENT_ERROR,
                    500,
                    e
            );
            log.warn("Vision API call failed for {}: {}", filename, e.getMessage());
            throw apiException;
        }
    }

    /**
     * Classifies an API error based on HTTP status code and response body.
     */
    private ErrorType classifyApiError(int statusCode, String responseBody) {
        if (statusCode == 401 || statusCode == 403) {
            return ErrorType.AUTHENTICATION_FAILED;
        }
        if (statusCode == 429) {
            // 429 = rate limit or quota exceeded
            // Check if response mentions usage limits or billing
            if (responseBody != null && (responseBody.contains("usage") || responseBody.contains("limit") || responseBody.contains("quota"))) {
                return ErrorType.QUOTA_EXCEEDED;
            }
            return ErrorType.QUOTA_EXCEEDED;
        }
        if (statusCode == 400) {
            return ErrorType.INVALID_REQUEST;
        }
        if (statusCode >= 500) {
            return ErrorType.TRANSIENT_ERROR;
        }
        return ErrorType.UNKNOWN_ERROR;
    }

    /**
     * Formats an error message appropriate for end users based on error type.
     */
    private String formatErrorMessage(ErrorType errorType) {
        return switch (errorType) {
            case AUTHENTICATION_FAILED -> "API key is invalid or expired. Please check configuration.";
            case QUOTA_EXCEEDED -> "Visual search quota exceeded. Please upgrade your plan or try again later.";
            case INVALID_REQUEST -> "Unable to process your request. Please try again.";
            case TRANSIENT_ERROR -> "Temporary service issue. Please try again.";
            case UNKNOWN_ERROR -> "An error occurred during visual search. Please try again.";
        };
    }

    private boolean isVideo(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && VIDEO_EXTS.contains(filename.substring(dot + 1).toLowerCase());
    }

    private String thumbnailMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }
}
