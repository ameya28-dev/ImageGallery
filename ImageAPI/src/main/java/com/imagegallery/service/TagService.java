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

    public List<String> autocomplete(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return tagRepository.findAll().stream()
                    .map(t -> t.getName())
                    .sorted()
                    .toList();
        }
        return tagRepository.findByNameStartingWithIgnoreCaseOrderByName(prefix)
                .stream()
                .map(t -> t.getName())
                .toList();
    }

    public List<TagCountDto> getRanked() {
        return tagRepository.findAllRankedByImageCount();
    }
}
