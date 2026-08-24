package com.imagegallery.exception;

/**
 * Represents an error from an external API call (e.g., Anthropic Vision API).
 * Includes error type categorization for granular frontend handling.
 */
public class ApiException extends RuntimeException {

    public enum ErrorType {
        /** API authentication failed (invalid key, expired key, etc.) */
        AUTHENTICATION_FAILED,
        /** API rate limit or quota exceeded (no billing, usage limit, etc.) */
        QUOTA_EXCEEDED,
        /** API request was malformed or invalid */
        INVALID_REQUEST,
        /** Network or transient error */
        TRANSIENT_ERROR,
        /** Unexpected error from API */
        UNKNOWN_ERROR
    }

    private final ErrorType errorType;
    private final int httpStatus;

    public ApiException(String message, ErrorType errorType, int httpStatus, Throwable cause) {
        super(message, cause);
        this.errorType = errorType;
        this.httpStatus = httpStatus;
    }

    public ApiException(String message, ErrorType errorType, int httpStatus) {
        super(message);
        this.errorType = errorType;
        this.httpStatus = httpStatus;
    }

    public ErrorType getErrorType() {
        return errorType;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    /**
     * Factory method: builds an ApiException from an ErrorType, with appropriate
     * HTTP status and user-friendly message.
     */
    public static ApiException fromErrorType(ErrorType errorType) {
        int status;
        String message;

        switch (errorType) {
            case AUTHENTICATION_FAILED:
                status = 401;
                message = "API key is invalid or expired. Please check configuration.";
                break;
            case QUOTA_EXCEEDED:
                status = 429;
                message = "Visual search quota exceeded. Please upgrade your plan or try again later.";
                break;
            case INVALID_REQUEST:
                status = 400;
                message = "Unable to process your request. Please try again.";
                break;
            case TRANSIENT_ERROR:
                status = 503;
                message = "Temporary service issue. Please try again.";
                break;
            case UNKNOWN_ERROR:
            default:
                status = 500;
                message = "An error occurred during visual search. Please try again.";
                break;
        }

        return new ApiException(message, errorType, status);
    }
}
