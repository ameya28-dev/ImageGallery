package com.imagegallery.config;

import com.imagegallery.security.GuestUploadInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final GuestUploadInterceptor guestUploadInterceptor;
  private final GalleryProperties galleryProperties;

  public WebConfig(
      GuestUploadInterceptor guestUploadInterceptor, GalleryProperties galleryProperties) {
    this.guestUploadInterceptor = guestUploadInterceptor;
    this.galleryProperties = galleryProperties;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String frontendUrl = galleryProperties.getFrontendUrl();

    registry
        .addMapping("/api/**")
        .allowedOrigins(frontendUrl)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true); // required for httpOnly cookie to flow cross-origin

    // Allow Spring Security's OAuth2 redirect endpoints
    registry
        .addMapping("/oauth2/**")
        .allowedOrigins(frontendUrl)
        .allowedMethods("GET")
        .allowCredentials(true);
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    // Only intercept the single-image upload endpoint
    registry.addInterceptor(guestUploadInterceptor).addPathPatterns("/api/images");
  }
}
