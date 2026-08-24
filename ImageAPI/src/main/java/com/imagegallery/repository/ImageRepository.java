package com.imagegallery.repository;

import com.imagegallery.model.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ImageRepository extends JpaRepository<Image, Long> {

    Optional<Image> findByFilename(String filename);

    boolean existsByFilename(String filename);

    List<Image> findAllByOrderByTakenAtDesc();

    List<Image> findByFavouriteTrueOrderByTakenAtDesc();

    @Query("SELECT DISTINCT i FROM Image i JOIN i.tags t WHERE t.name = :tagName ORDER BY i.takenAt DESC")
    List<Image> findByTagNameOrderByTakenAtDesc(String tagName);

    // -------------------------------------------------------------------------
    // Visual content search — used by ImageService.searchByContent()
    // -------------------------------------------------------------------------

    /** Images whose AI description contains the query (case-insensitive). */
    List<Image> findByAiDescriptionContainingIgnoreCase(String q);

    /** Images whose filename contains the query (case-insensitive). */
    List<Image> findByFilenameContainingIgnoreCase(String q);

    /** Images that have any tag whose name contains the query (case-insensitive). */
    @Query("SELECT DISTINCT i FROM Image i JOIN i.tags t WHERE LOWER(t.name) LIKE :pattern")
    List<Image> findByTagNameContainingIgnoreCase(@Param("pattern") String pattern);

    /** Images that have not yet been described by the Vision API. */
    List<Image> findByAiDescriptionIsNull();

    /** Images whose last description attempt had a specific status. */
    List<Image> findByDescriptionStatus(String status);
}
