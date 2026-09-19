package com.imagegallery.controller;

import com.imagegallery.dto.ImageDto;
import com.imagegallery.security.CurrentUserResolver;
import com.imagegallery.service.SeedImportService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** User account endpoints — authenticated only. */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

  private final SeedImportService seedImportService;
  private final CurrentUserResolver currentUserResolver;

  /**
   * Import seed images into the authenticated user's gallery. Only available for authenticated
   * users who own zero images (first-login guard).
   */
  @PostMapping("/import-seed-images")
  public ResponseEntity<List<ImageDto>> importSeedImages() {
    Long ownerId =
        currentUserResolver
            .resolveOwnerId()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
    return ResponseEntity.ok(seedImportService.importSeedImages(ownerId));
  }
}
