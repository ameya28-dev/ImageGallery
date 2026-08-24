package com.imagegallery.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${gallery.jwt.secret}")
    private String jwtSecret;

    private static final long ACCESS_TOKEN_MS  = 60 * 60 * 1000L;          // 1 hour
    private static final long REFRESH_TOKEN_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    public String generateAccessToken(String email) {
        return buildToken(email, "access", ACCESS_TOKEN_MS);
    }

    public String generateRefreshToken(String email) {
        return buildToken(email, "refresh", REFRESH_TOKEN_MS);
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, String expectedType) {
        try {
            Claims claims = parseClaims(token);
            return expectedType.equals(claims.get("type"))
                    && !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getRefreshTokenMs() {
        return REFRESH_TOKEN_MS;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private String buildToken(String email, String type, long expiryMs) {
        return Jwts.builder()
                .subject(email)
                .claim("type", type)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(signingKey())
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey signingKey() {
        byte[] bytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(bytes);
    }
}
