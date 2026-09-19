package com.imagegallery.service;

import com.imagegallery.config.GalleryProperties;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("local")
@RequiredArgsConstructor
public class LocalStorageService implements StorageService {

  private final GalleryProperties properties;

  @Override
  public String storeImage(String filename, InputStream data, long size, String contentType) {
    Path dest = imagePath(filename);
    try {
      Files.createDirectories(dest.getParent());
      Files.copy(data, dest, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to store image: " + filename, e);
    }
    return filename;
  }

  @Override
  public String storeThumbnail(String filename, InputStream data, long size) {
    Path dest = thumbnailPath(filename);
    try {
      Files.createDirectories(dest.getParent());
      Files.copy(data, dest, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to store thumbnail: " + filename, e);
    }
    return filename;
  }

  @Override
  public InputStream retrieveImage(String storageKey) {
    try {
      return Files.newInputStream(imagePath(storageKey));
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to read image: " + storageKey, e);
    }
  }

  @Override
  public InputStream retrieveThumbnail(String storageKey) {
    try {
      return Files.newInputStream(thumbnailPath(storageKey));
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to read thumbnail: " + storageKey, e);
    }
  }

  @Override
  public Instant getImageLastModified(String storageKey) {
    try {
      return Files.getLastModifiedTime(imagePath(storageKey)).toInstant();
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to get image last modified time: " + storageKey, e);
    }
  }

  @Override
  public Instant getThumbnailLastModified(String storageKey) {
    try {
      return Files.getLastModifiedTime(thumbnailPath(storageKey)).toInstant();
    } catch (IOException e) {
      throw new UncheckedIOException(
          "Failed to get thumbnail last modified time: " + storageKey, e);
    }
  }

  @Override
  public void deleteImage(String storageKey, String thumbnailKey) {
    try {
      Files.deleteIfExists(imagePath(storageKey));
      Files.deleteIfExists(thumbnailPath(thumbnailKey));
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to delete image: " + storageKey, e);
    }
  }

  @Override
  public void copyImage(String sourceKey, String destKey) {
    try {
      Path src = imagePath(sourceKey);
      Path dst = imagePath(destKey);
      Files.createDirectories(dst.getParent());
      Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to copy image: " + sourceKey + " -> " + destKey, e);
    }
  }

  @Override
  public void copyThumbnail(String sourceKey, String destKey) {
    try {
      Path src = thumbnailPath(sourceKey);
      Path dst = thumbnailPath(destKey);
      Files.createDirectories(dst.getParent());
      Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new UncheckedIOException(
          "Failed to copy thumbnail: " + sourceKey + " -> " + destKey, e);
    }
  }

  public Path imagePath(String filename) {
    return Paths.get(properties.getImagesPath()).resolve(filename);
  }

  public Path thumbnailPath(String filename) {
    return Paths.get(properties.getThumbnailsPath()).resolve(filename);
  }
}
