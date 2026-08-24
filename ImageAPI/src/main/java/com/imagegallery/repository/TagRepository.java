package com.imagegallery.repository;

import com.imagegallery.dto.TagCountDto;
import com.imagegallery.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findByName(String name);

    List<Tag> findByNameStartingWithIgnoreCaseOrderByName(String prefix);

    @Query("SELECT new com.imagegallery.dto.TagCountDto(t.name, COUNT(i)) " +
           "FROM Tag t JOIN t.images i GROUP BY t.id, t.name ORDER BY COUNT(i) DESC")
    List<TagCountDto> findAllRankedByImageCount();
}
