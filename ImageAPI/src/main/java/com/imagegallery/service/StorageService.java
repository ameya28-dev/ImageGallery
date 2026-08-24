package com.imagegallery.service;

import java.io.InputStream;

public interface StorageService {

    /**
     * Store raw image bytes. Returns a storage key (relative path or S3 key).
     */
    String storeImage(String filename, InputStream data, long size, String contentType);

    /**
     * Store thumbnail bytes. Returns a storage key.
     */
    String storeThumbnail(String filename, InputStream data, long size);

    /**
     * Retrieve image content as a stream.
     */
    InputStream retrieveImage(String storageKey);

    /**
     * Retrieve thumbnail content as a stream.
     */
    InputStream retrieveThumbnail(String storageKey);

    /**
     * Delete image and its thumbnail by storage key.
     */
    void deleteImage(String storageKey, String thumbnailKey);
}
