package com.imagegallery.controller;

import com.imagegallery.service.LocalImageScanner;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scan")
@Profile("local")
@RequiredArgsConstructor
public class ScanController {

  private final LocalImageScanner scanner;

  @PostMapping
  public ResponseEntity<String> scan() {
    scanner.scan();
    return ResponseEntity.ok("Scan complete");
  }
}
