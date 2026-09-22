package com.imagegallery.config;

import com.imagegallery.security.JwtAuthFilter;
import com.imagegallery.security.UserDetailsServiceImpl;
import com.imagegallery.service.OAuth2AuthSuccessHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final JwtAuthFilter jwtAuthFilter;
  private final UserDetailsServiceImpl userDetailsService;
  private final GalleryProperties galleryProperties;
  private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider;
  private final ObjectProvider<OAuth2AuthSuccessHandler> oAuth2AuthSuccessHandlerProvider;

  public SecurityConfig(
      JwtAuthFilter jwtAuthFilter,
      UserDetailsServiceImpl userDetailsService,
      GalleryProperties galleryProperties,
      ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
      ObjectProvider<OAuth2AuthSuccessHandler> oAuth2AuthSuccessHandlerProvider) {
    this.jwtAuthFilter = jwtAuthFilter;
    this.userDetailsService = userDetailsService;
    this.galleryProperties = galleryProperties;
    this.clientRegistrationRepositoryProvider = clientRegistrationRepositoryProvider;
    this.oAuth2AuthSuccessHandlerProvider = oAuth2AuthSuccessHandlerProvider;
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth -> {
              // Common public endpoints for all profiles
              auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                  .permitAll()
                  .requestMatchers("/api/auth/**")
                  .permitAll()
                  .requestMatchers("/oauth2/**", "/login/oauth2/**")
                  .permitAll()
                  .requestMatchers(
                      "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/v3/api-docs.yaml")
                  .permitAll();

              // Guest access (browsing and single upload) — local profile only
              if (galleryProperties.isGuestAccessEnabled()) {
                auth.requestMatchers(HttpMethod.GET, "/api/images/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/tags/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/images")
                    .permitAll();
              }

              // Seed-import endpoint — defense-in-depth gating for feature profile
              if (!galleryProperties.isSeedImportEnabled()) {
                auth.requestMatchers(HttpMethod.POST, "/api/users/me/import-seed-images").denyAll();
              }

              // Everything else requires authentication
              auth.anyRequest().authenticated();
            })
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(
                        (req, res, e) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter().write("{\"error\":\"Unauthorized\"}");
                        })
                    .accessDeniedHandler(
                        (req, res, e) -> {
                          res.setStatus(403);
                          res.setContentType("application/json");
                          res.getWriter().write("{\"error\":\"Forbidden\"}");
                        }));

    // Wire Google OAuth2 only if a client registration is configured
    var repository = clientRegistrationRepositoryProvider.getIfAvailable();
    var handler = oAuth2AuthSuccessHandlerProvider.getIfAvailable();
    if (repository != null && handler != null) {
      http.oauth2Login(oauth2 -> oauth2.successHandler(handler).failureUrl("/login?error=oauth2"));
    }

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  public DaoAuthenticationProvider authenticationProvider() {
    // Constructor injection (Spring Security 6.3+); the no-arg constructor plus
    // setUserDetailsService() is deprecated in favor of passing it up front.
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder());
    return provider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
      throws Exception {
    return config.getAuthenticationManager();
  }
}
