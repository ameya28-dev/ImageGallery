package com.imagegallery.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables Spring's @Async support — used by ImageDescriptionService to describe
 * uploaded images in a background thread without blocking the upload response.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
