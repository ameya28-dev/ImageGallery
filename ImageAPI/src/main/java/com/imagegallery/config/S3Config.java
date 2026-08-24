package com.imagegallery.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

// TODO: In production, prefer IAM roles (EC2 instance profile, ECS task role, Lambda execution role)
//       over static credentials. To do so, replace StaticCredentialsProvider with
//       DefaultCredentialsProvider.create() and remove access-key/secret-key from the yml.

@Configuration
@Profile("feature")
@RequiredArgsConstructor
public class S3Config {

    private final GalleryProperties properties;

    @Bean
    public S3Client s3Client() {
        GalleryProperties.S3 s3 = properties.getS3();
        return S3Client.builder()
                .region(Region.of(s3.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(s3.getAccessKey(), s3.getSecretKey())
                ))
                .build();
    }
}
