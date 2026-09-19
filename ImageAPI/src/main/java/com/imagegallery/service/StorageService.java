package com.imagegallery.service;

import java.io.InputStream;
import java.time.Instant;

public interface StorageService {

  /** Store raw image bytes. Returns a storage key (relative path or S3 key). */
  String storeImage(String filename, InputStream data, long size, String contentType);

  /** Store thumbnail bytes. Returns a storage key. */
  String storeThumbnail(String filename, InputStream data, long size);

  /** Retrieve image content as a stream. */
  InputStream retrieveImage(String storageKey);

  /** Retrieve thumbnail content as a stream. */
  InputStream retrieveThumbnail(String storageKey);

  /** Get the last-modified timestamp of the full image for cache validation. */
  Instant getImageLastModified(String storageKey);

  /** Get the last-modified timestamp of the thumbnail for cache validation. */
  Instant getThumbnailLastModified(String storageKey);

  /** Delete image and its thumbnail by storage key. */
  void deleteImage(String storageKey, String thumbnailKey);

  /**
   * Copy (server-side) an image from one storage key to another. Used by seed-import to duplicate
   * images without re-uploading.
   */
  void copyImage(String sourceKey, String destKey);

  /** Copy (server-side) a thumbnail from one storage key to another. */
  void copyThumbnail(String sourceKey, String destKey);
}
