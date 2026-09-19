package com.imagegallery.repository;

import com.imagegallery.model.Image;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImageRepository extends JpaRepository<Image, Long> {

  /**
   * Find all images for an owner (null = guest pool), ordered by taken date descending. Explicit
   * JPQL used instead of derived methods for reliable null-handling.
   */
  @Query(
      "SELECT i FROM Image i WHERE (:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId ORDER BY i.takenAt DESC, i.id DESC")
  List<Image> findAllForOwnerOrderByTakenAtDesc(@Param("ownerId") Long ownerId);

  /** Find favourite images for an owner. */
  @Query(
      "SELECT i FROM Image i WHERE i.favourite = true AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId) ORDER BY i.takenAt DESC, i.id DESC")
  List<Image> findFavouritesForOwner(@Param("ownerId") Long ownerId);

  /** Find images with a specific tag for an owner. */
  @Query(
      "SELECT DISTINCT i FROM Image i JOIN i.tags t WHERE t.name = :tagName AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId) ORDER BY i.takenAt DESC, i.id DESC")
  List<Image> findByTagNameForOwner(
      @Param("ownerId") Long ownerId, @Param("tagName") String tagName);

  /** Search images by AI description for an owner. */
  @Query(
      "SELECT i FROM Image i WHERE LOWER(i.aiDescription) LIKE LOWER(CONCAT('%', :q, '%')) AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId)")
  List<Image> findByAiDescriptionForOwner(@Param("ownerId") Long ownerId, @Param("q") String q);

  /** Search images by filename for an owner. */
  @Query(
      "SELECT i FROM Image i WHERE LOWER(i.filename) LIKE LOWER(CONCAT('%', :q, '%')) AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId)")
  List<Image> findByFilenameForOwner(@Param("ownerId") Long ownerId, @Param("q") String q);

  /** Find tag names matching a prefix for an owner (used by autocomplete). */
  @Query(
      "SELECT DISTINCT t.name FROM Tag t JOIN t.images i WHERE LOWER(t.name) LIKE LOWER(CONCAT(:prefix,'%')) AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId) ORDER BY t.name")
  List<String> findTagNamesByPrefixForOwner(
      @Param("ownerId") Long ownerId, @Param("prefix") String prefix);

  /** Find images without AI descriptions for an owner (used by batch description job). */
  @Query(
      "SELECT i FROM Image i WHERE i.aiDescription IS NULL AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId)")
  List<Image> findWithoutDescriptionForOwner(@Param("ownerId") Long ownerId);

  /** Find images with a specific description status for an owner. */
  @Query(
      "SELECT i FROM Image i WHERE i.descriptionStatus = :status AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId)")
  List<Image> findByDescriptionStatusForOwner(
      @Param("ownerId") Long ownerId, @Param("status") String status);

  /**
   * Check if a filename exists for a given owner (per-owner uniqueness). Explicit JPQL to handle
   * null ownerId correctly.
   */
  @Query(
      "SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END FROM Image i WHERE i.filename = :filename AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId)")
  boolean existsByOwnerIdAndFilename(
      @Param("ownerId") Long ownerId, @Param("filename") String filename);

  /**
   * Check if an owner (non-null) has any images. Used to guard seed-import (only on first login).
   */
  boolean existsByOwnerId(Long ownerId);

  /**
   * Find all seed-sample images (the curated 8) for offering in first-login import prompt. Always
   * searches owner_id IS NULL (public pool).
   */
  @Query(
      "SELECT i FROM Image i WHERE i.ownerId IS NULL AND i.seedSample = true ORDER BY i.takenAt DESC, i.id DESC")
  List<Image> findByOwnerIdIsNullAndSeedSampleTrueOrderByTakenAtDescIdDesc();

  /**
   * Find images without AI descriptions (global, for monitoring/stats). Used by
   * ImageDescriptionService for metrics.
   */
  List<Image> findByAiDescriptionIsNull();
}
