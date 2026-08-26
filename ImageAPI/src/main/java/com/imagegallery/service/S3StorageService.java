package com.imagegallery.service;

import com.imagegallery.config.GalleryProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;
import java.time.Instant;

import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;

// TODO: For production on AWS (EC2/ECS/Lambda), remove explicit credentials from S3Config
//       and rely on the instance's IAM role instead. The SDK will auto-discover them via
//       the DefaultCredentialsProvider chain without any code changes here.

// TODO: Configure Content-Disposition and cache headers on PutObjectRequest if serving
//       images directly from S3 (without a CloudFront CDN in front).

@Service
@Profile("feature")
@RequiredArgsConstructor
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final GalleryProperties properties;

    private static final String THUMBNAIL_PREFIX = "thumbnails/";

    @Override
    public String storeImage(String filename, InputStream data, long size, String contentType) {
        String key = "images/" + filename;
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(properties.getS3().getBucketName())
                        .key(key)
                        .contentType(contentType)
                        .contentLength(size)
                        .build(),
                RequestBody.fromInputStream(data, size)
        );
        return key;
    }

    @Override
    public String storeThumbnail(String filename, InputStream data, long size) {
        String key = THUMBNAIL_PREFIX + filename;
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(properties.getS3().getBucketName())
                        .key(key)
                        .contentType("image/jpeg")
                        .contentLength(size)
                        .build(),
                RequestBody.fromInputStream(data, size)
        );
        return key;
    }

    @Override
    public InputStream retrieveImage(String storageKey) {
        return s3Client.getObject(GetObjectRequest.builder()
                .bucket(properties.getS3().getBucketName())
                .key(storageKey)
                .build());
    }

    @Override
    public InputStream retrieveThumbnail(String filename) {
        return s3Client.getObject(GetObjectRequest.builder()
                .bucket(properties.getS3().getBucketName())
                .key(THUMBNAIL_PREFIX + filename)
                .build());
    }

    @Override
    public Instant getImageLastModified(String storageKey) {
        HeadObjectResponse response = s3Client.headObject(HeadObjectRequest.builder()
                .bucket(properties.getS3().getBucketName())
                .key(storageKey)
                .build());
        return response.lastModified();
    }

    @Override
    public Instant getThumbnailLastModified(String storageKey) {
        HeadObjectResponse response = s3Client.headObject(HeadObjectRequest.builder()
                .bucket(properties.getS3().getBucketName())
                .key(THUMBNAIL_PREFIX + storageKey)
                .build());
        return response.lastModified();
    }

    @Override
    public void deleteImage(String storageKey, String thumbnailKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(properties.getS3().getBucketName())
                .key(storageKey)
                .build());
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(properties.getS3().getBucketName())
                .key(THUMBNAIL_PREFIX + thumbnailKey)
                .build());
    }

    @Override
    public void copyImage(String sourceKey, String destKey) {
        String bucket = properties.getS3().getBucketName();
        s3Client.copyObject(CopyObjectRequest.builder()
                .sourceBucket(bucket)
                .sourceKey(sourceKey)
                .destinationBucket(bucket)
                .destinationKey(destKey)
                .build());
    }

    @Override
    public void copyThumbnail(String sourceKey, String destKey) {
        String bucket = properties.getS3().getBucketName();
        s3Client.copyObject(CopyObjectRequest.builder()
                .sourceBucket(bucket)
                .sourceKey(sourceKey)
                .destinationBucket(bucket)
                .destinationKey(destKey)
                .build());
    }
}
