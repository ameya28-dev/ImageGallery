package com.imagegallery.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Resolves the numeric user ID of the current request's owner scope.
 * Empty for anonymous/guest requests → owner scope is NULL (the public seed pool).
 * Non-empty for authenticated requests → owner scope is that user's ID.
 */
@Component
public class CurrentUserResolver {

    /**
     * Returns the current user's ID if authenticated, or empty for guest/anonymous requests.
     */
    public Optional<Long> resolveOwnerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof AppUserPrincipal principal) {
            return Optional.of(principal.getId());
        }
        return Optional.empty();
    }
}
