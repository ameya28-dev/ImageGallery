package com.imagegallery.config;

import com.imagegallery.security.GuestUploadInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final GuestUploadInterceptor guestUploadInterceptor;

    public WebConfig(GuestUploadInterceptor guestUploadInterceptor) {
        this.guestUploadInterceptor = guestUploadInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);   // required for httpOnly cookie to flow cross-origin

        // Allow Spring Security's OAuth2 redirect endpoints
        registry.addMapping("/oauth2/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Only intercept the single-image upload endpoint
        registry.addInterceptor(guestUploadInterceptor)
                .addPathPatterns("/api/images");
    }
}
