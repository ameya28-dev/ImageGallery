package com.imagegallery.controller;

import com.imagegallery.exception.ApiException;
import com.imagegallery.exception.AuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.UncheckedIOException;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> errors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a, b) -> a));
        return ResponseEntity.badRequest().body(errors);
    }

    /**
     * Handles authentication and authorization errors with detailed error types.
     * Allows frontend to distinguish between user-not-found, wrong password, etc.
     */
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<Map<String, String>> handleAuthException(AuthException e) {
        log.warn("Auth error [{}]: {}", e.getErrorType(), e.getMessage());

        return ResponseEntity
                .status(e.getHttpStatus())
                .body(Map.of(
                        "errorType", e.getErrorType().name(),
                        "message", e.getMessage()
                ));
    }

    /**
     * Handles API exceptions from external services (e.g., Anthropic Vision API).
     * Returns the HTTP status code indicated by the exception along with a user-friendly error message.
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> handleApiException(ApiException e) {
        // Log with error type for debugging
        log.warn("API error [{}]: {}", e.getErrorType(), e.getMessage());

        // Return user-friendly error message at the appropriate HTTP status
        return ResponseEntity
                .status(e.getHttpStatus())
                .body(Map.of(
                        "error", e.getErrorType().name(),
                        "message", e.getMessage()
                ));
    }

    /**
     * Handles storage layer I/O exceptions (file not found, permission denied, etc.).
     * Returns a clean 500 error instead of letting the exception leak through filter chain
     * and surface as an inconsistent or cryptic status code.
     */
    @ExceptionHandler(UncheckedIOException.class)
    public ResponseEntity<Map<String, String>> handleStorageException(UncheckedIOException e) {
        log.error("Storage I/O error: {}", e.getMessage());
        return ResponseEntity
                .status(500)
                .body(Map.of("error", "Storage error: " + e.getMessage()));
    }

    /**
     * Catch-all fallback for any uncaught exception.
     * Prevents exceptions from propagating to Spring's error handler (/error dispatch),
     * which would otherwise re-enter the security filter chain without authentication
     * and return a misleading 401 instead of the actual 500 error.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUncaughtException(Exception e) {
        log.error("Uncaught exception:", e);
        return ResponseEntity
                .status(500)
                .body(Map.of(
                    "error", "Internal server error",
                    "message", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()
                ));
    }
}
