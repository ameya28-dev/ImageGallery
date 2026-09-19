package com.imagegallery.service;

import com.imagegallery.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * Handles the post-OAuth2 redirect after Google authenticates the user. This bean is always
 * created, but only used when OAuth2 is configured (feature profile). The SecurityConfig
 * conditionally wires it into the filter chain only if a ClientRegistrationRepository is present.
 * (Note: @ConditionalOnBean is removed to avoid bean initialization order issues — null-checking in
 * SecurityConfig is sufficient.)
 */
@Component
public class OAuth2AuthSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  private final AuthService authService;

  @Value("${gallery.frontend.url:http://localhost:3000}")
  private String frontendUrl;

  public OAuth2AuthSuccessHandler(AuthService authService) {
    this.authService = authService;
  }

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException {
    OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
    Map<String, Object> attrs = oauthToken.getPrincipal().getAttributes();

    String googleId = String.valueOf(attrs.get("sub"));
    String email = String.valueOf(attrs.get("email"));

    User user = authService.upsertGoogleUser(googleId, email);
    // Issues refresh cookie and returns access token
    var authResponse = authService.issueTokenPair(user, response);

    String redirect =
        frontendUrl
            + "/auth/callback?token="
            + URLEncoder.encode(authResponse.accessToken(), StandardCharsets.UTF_8)
            + "&email="
            + URLEncoder.encode(email, StandardCharsets.UTF_8);

    getRedirectStrategy().sendRedirect(request, response, redirect);
  }
}
