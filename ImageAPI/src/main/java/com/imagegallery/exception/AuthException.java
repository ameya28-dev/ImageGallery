package com.imagegallery.exception;

/** Authentication and authorization errors with detailed error types for frontend handling. */
public class AuthException extends RuntimeException {

  public enum ErrorType {
    /** User account doesn't exist */
    USER_NOT_FOUND,
    /** Password is incorrect */
    INVALID_PASSWORD,
    /** Email already registered */
    EMAIL_ALREADY_EXISTS,
    /** General authentication failure */
    AUTHENTICATION_FAILED,
    /** Invalid or expired token */
    INVALID_TOKEN,
    /** Token refresh failed */
    REFRESH_FAILED
  }

  private final ErrorType errorType;
  private final int httpStatus;

  public AuthException(String message, ErrorType errorType, int httpStatus) {
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
}
