package com.imagegallery.controller;

import com.imagegallery.dto.TagCountDto;
import com.imagegallery.security.CurrentUserResolver;
import com.imagegallery.service.TagService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

  private final TagService tagService;
  private final CurrentUserResolver currentUserResolver;

  @GetMapping
  public ResponseEntity<List<String>> getTags(@RequestParam(required = false) String prefix) {
    Long ownerId = currentUserResolver.resolveOwnerId().orElse(null);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
        .body(tagService.autocomplete(ownerId, prefix));
  }

  @GetMapping("/ranked")
  public ResponseEntity<List<TagCountDto>> getRanked() {
    Long ownerId = currentUserResolver.resolveOwnerId().orElse(null);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
        .body(tagService.getRanked(ownerId));
  }
}
