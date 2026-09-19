package com.imagegallery.controller;

import com.imagegallery.dto.AuthResponse;
import com.imagegallery.dto.LoginRequest;
import com.imagegallery.dto.RegisterRequest;
import com.imagegallery.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  /** Email + password login. */
  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    return ResponseEntity.ok(authService.login(request, response));
  }

  /** Self-service email + password registration. */
  @PostMapping("/register")
  public ResponseEntity<AuthResponse> register(
      @Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
    return ResponseEntity.ok(authService.register(request, response));
  }

  /** Silent token refresh using the httpOnly refresh cookie. */
  @PostMapping("/refresh")
  public ResponseEntity<AuthResponse> refresh(
      @CookieValue(name = "refreshToken", required = false) String refreshToken,
      HttpServletResponse response) {
    if (refreshToken == null) {
      return ResponseEntity.status(401).build();
    }
    return ResponseEntity.ok(authService.refresh(refreshToken, response));
  }

  /** Logout — clears refresh token in DB and cookie. */
  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
      @CookieValue(name = "refreshToken", required = false) String refreshToken,
      HttpServletResponse response) {
    authService.logout(refreshToken, response);
    return ResponseEntity.ok().build();
  }

  /** Returns the currently authenticated user's info. */
  @GetMapping("/me")
  public ResponseEntity<Map<String, String>> me() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
      return ResponseEntity.status(401).build();
    }
    return ResponseEntity.ok(Map.of("email", auth.getName()));
  }
}
