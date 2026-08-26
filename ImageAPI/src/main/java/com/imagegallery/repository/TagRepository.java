package com.imagegallery.repository;

import com.imagegallery.dto.TagCountDto;
import com.imagegallery.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {

    /**
     * Find a tag by exact name (global vocabulary lookup — used by tag-add for dedup).
     * Tag names are globally shared; only the per-image associations are owner-scoped.
     */
    Optional<Tag> findByName(String name);

    /**
     * Find all tag names for an owner (for display/management).
     */
    @Query("SELECT DISTINCT t.name FROM Tag t JOIN t.images i WHERE (:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId ORDER BY t.name")
    List<String> findAllNamesForOwner(@Param("ownerId") Long ownerId);

    /**
     * Autocomplete: find tag names matching a prefix for an owner.
     */
    @Query("SELECT DISTINCT t.name FROM Tag t JOIN t.images i WHERE LOWER(t.name) LIKE LOWER(CONCAT(:prefix,'%')) AND ((:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId) ORDER BY t.name")
    List<String> findByPrefixForOwner(@Param("ownerId") Long ownerId, @Param("prefix") String prefix);

    /**
     * Find tags ranked by frequency for an owner (most images tagged wins).
     */
    @Query("SELECT new com.imagegallery.dto.TagCountDto(t.name, COUNT(i)) FROM Tag t JOIN t.images i WHERE (:ownerId IS NULL AND i.ownerId IS NULL) OR i.ownerId = :ownerId GROUP BY t.id, t.name ORDER BY COUNT(i) DESC")
    List<TagCountDto> findRankedForOwner(@Param("ownerId") Long ownerId);
}
