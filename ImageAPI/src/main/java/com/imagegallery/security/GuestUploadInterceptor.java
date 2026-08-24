package com.imagegallery.security;

import com.imagegallery.service.GuestRateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class GuestUploadInterceptor implements HandlerInterceptor {

    private final GuestRateLimitService rateLimitService;

    public GuestUploadInterceptor(GuestRateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        // Only applies to POST /api/images (single upload)
        if (!"POST".equalsIgnoreCase(request.getMethod())) return true;

        // Authenticated owners bypass the rate limit
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            return true;
        }

        String ip = clientIp(request);
        if (!rateLimitService.tryConsume(ip)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Daily upload limit reached. Sign in for unlimited uploads.\",\"limit\":"
                    + GuestRateLimitService.DAILY_LIMIT + "}");
            return false;
        }

        response.setHeader("X-RateLimit-Remaining", String.valueOf(rateLimitService.remaining(ip)));
        return true;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
