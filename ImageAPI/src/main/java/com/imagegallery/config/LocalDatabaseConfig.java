package com.imagegallery.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

@Slf4j
@Configuration
@Profile("local")
public class LocalDatabaseConfig {

    // Ensure the data/ directory exists before SQLite tries to create gallery.db inside it
    static {
        try {
            Files.createDirectories(Paths.get("data"));
        } catch (IOException e) {
            log.warn("Could not create data/ directory: {}", e.getMessage());
        }
    }
}
