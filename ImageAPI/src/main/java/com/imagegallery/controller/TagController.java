package com.imagegallery.controller;

import com.imagegallery.dto.TagCountDto;
import com.imagegallery.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<List<String>> getTags(@RequestParam(required = false) String prefix) {
        // Tags can change when new tags are added or removed, so don't cache
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(tagService.autocomplete(prefix));
    }

    @GetMapping("/ranked")
    public ResponseEntity<List<TagCountDto>> getRanked() {
        // Tag rankings change when images are tagged/untagged, so don't cache
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(tagService.getRanked());
    }
}
