package com.imagegallery.service;

import com.imagegallery.dto.AuthResponse;
import com.imagegallery.dto.LoginRequest;
import com.imagegallery.dto.RegisterRequest;
import com.imagegallery.exception.AuthException;
import com.imagegallery.model.User;
import com.imagegallery.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Value("${gallery.admin.email}")
    private String adminEmail;

    @Value("${gallery.admin.password}")
    private String adminPassword;

    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    /** Creates (or updates) the owner account on startup. */
    @EventListener(ApplicationReadyEvent.class)
    public void provisionOwner() {
        userRepository.findByEmail(adminEmail).ifPresentOrElse(existing -> {
            // Re-hash if the env password changed
            if (!passwordEncoder.matches(adminPassword, existing.getPasswordHash())) {
                existing.setPasswordHash(passwordEncoder.encode(adminPassword));
                userRepository.save(existing);
                log.info("Owner password updated for {}", adminEmail);
            }
        }, () -> {
            User owner = new User();
            owner.setEmail(adminEmail);
            owner.setPasswordHash(passwordEncoder.encode(adminPassword));
            owner.setProvider("LOCAL");
            userRepository.save(owner);
            log.info("Owner account provisioned: {}", adminEmail);
        });
    }

    /** Email+password login. Issues tokens and sets refresh cookie. */
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        // First, check if the user account exists
        var userOpt = userRepository.findByEmail(request.email());

        if (userOpt.isEmpty()) {
            // User doesn't exist — provide specific error type
            throw new AuthException(
                    "Account doesn't exist. Please create one.",
                    AuthException.ErrorType.USER_NOT_FOUND,
                    400
            );
        }

        try {
            // Attempt authentication
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (BadCredentialsException e) {
            // Wrong password
            throw new AuthException(
                    "Incorrect password. Please try again.",
                    AuthException.ErrorType.INVALID_PASSWORD,
                    401
            );
        }

        User user = userOpt.get();
        return issueTokenPair(user, response);
    }

    /** Self-service registration. Creates a new user account and issues tokens. */
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        // Check if email is already registered
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Create and save the new user
        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProvider("LOCAL");
        userRepository.save(user);
        log.info("New user registered: {}", request.email());

        // Issue tokens immediately (auto-login on registration)
        return issueTokenPair(user, response);
    }

    /** Rotates the refresh token. Returns new access token. */
    public AuthResponse refresh(String oldRefreshToken, HttpServletResponse response) {
        if (oldRefreshToken == null || !jwtService.isTokenValid(oldRefreshToken, "refresh")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        String email = jwtService.extractEmail(oldRefreshToken);
        User user = userRepository.findByEmail(email)
                .filter(u -> oldRefreshToken.equals(u.getRefreshToken()))
                .filter(u -> u.getRefreshTokenExpiry() != null
                          && u.getRefreshTokenExpiry().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token mismatch"));
        return issueTokenPair(user, response);
    }

    /** Invalidates the refresh token and clears the cookie. */
    public void logout(String refreshToken, HttpServletResponse response) {
        if (refreshToken != null) {
            userRepository.findByRefreshToken(refreshToken).ifPresent(user -> {
                user.setRefreshToken(null);
                user.setRefreshTokenExpiry(null);
                userRepository.save(user);
            });
        }
        clearRefreshCookie(response);
    }

    /** Creates or updates a Google-authenticated user. */
    public User upsertGoogleUser(String googleId, String email) {
        return userRepository.findByEmail(email).map(user -> {
            user.setGoogleId(googleId);
            user.setProvider("GOOGLE");
            return userRepository.save(user);
        }).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setProvider("GOOGLE");
            user.setGoogleId(googleId);
            return userRepository.save(user);
        });
    }

    /** Issues a fresh access + refresh token pair, persists the refresh token, sets cookie. */
    public AuthResponse issueTokenPair(User user, HttpServletResponse response) {
        String accessToken  = jwtService.generateAccessToken(user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        userRepository.save(user);

        setRefreshCookie(response, refreshToken);
        return new AuthResponse(accessToken, user.getEmail());
    }

    // ── cookie helpers ──────────────────────────────────────────────────────

    private void setRefreshCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(false)          // set true when serving over HTTPS
                .sameSite("Lax")
                .maxAge(Duration.ofMillis(jwtService.getRefreshTokenMs()))
                .path("/api/auth")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .maxAge(0)
                .path("/api/auth")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
