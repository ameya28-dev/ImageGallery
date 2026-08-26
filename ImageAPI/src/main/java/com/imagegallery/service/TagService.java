package com.imagegallery.service;

import com.imagegallery.dto.TagCountDto;
import com.imagegallery.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    /**
     * Autocomplete tag names for an owner, by prefix.
     * Only tags from images owned by this caller are suggested.
     */
    public List<String> autocomplete(Long ownerId, String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return tagRepository.findAllNamesForOwner(ownerId);
        }
        return tagRepository.findByPrefixForOwner(ownerId, prefix);
    }

    /**
     * Get tags ranked by frequency for an owner.
     * Only tags from images owned by this caller are ranked.
     */
    public List<TagCountDto> getRanked(Long ownerId) {
        return tagRepository.findRankedForOwner(ownerId);
    }
}
