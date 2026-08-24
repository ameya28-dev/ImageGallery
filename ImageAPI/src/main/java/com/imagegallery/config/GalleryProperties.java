package com.imagegallery.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "gallery")
@Getter
@Setter
public class GalleryProperties {

    private Storage storage = new Storage();
    private S3 s3 = new S3();
    private String imagesPath;
    private String thumbnailsPath;
    private Thumbnail thumbnail = new Thumbnail();

    @Getter
    @Setter
    public static class Storage {
        private String type;
    }

    @Getter
    @Setter
    public static class S3 {
        private String bucketName;
        private String region;
        private String accessKey;
        private String secretKey;
    }

    @Getter
    @Setter
    public static class Thumbnail {
        private int width = 400;
        private int height = 400;
    }
}
