package com.imagegallery.exception;

/** Represents an error during search operations, often caused by upstream API failures. */
public class SearchException extends RuntimeException {

  public SearchException(String message) {
    super(message);
  }

  public SearchException(String message, Throwable cause) {
    super(message, cause);
  }
}
