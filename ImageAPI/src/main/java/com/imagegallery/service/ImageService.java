package com.imagegallery.service;

import com.imagegallery.dto.ImageDto;
import com.imagegallery.dto.ImageGroupDto;
import com.imagegallery.model.Image;
import com.imagegallery.model.Tag;
import com.imagegallery.repository.ImageRepository;
import com.imagegallery.repository.TagRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageService {

    private final ImageRepository imageRepository;
    private final TagRepository tagRepository;
    private final StorageService storageService;
    private final ThumbnailService thumbnailService;

    private static final Map<String, String> EXT_TO_MEDIA_TYPE = Map.ofEntries(
            Map.entry("gif", "GIF"),
            Map.entry("webp", "WEBP"),
            Map.entry("mp4", "Video"),
            Map.entry("mov", "Video"),
            Map.entry("avi", "Video"),
            Map.entry("mkv", "Video"),
            Map.entry("m4v", "Video"),
            Map.entry("wmv", "Video"),
            Map.entry("webm", "Video")
    );
    private static final Set<String> IMAGE_EXTS = Set.of("jpg", "jpeg", "png");

    @Transactional(readOnly = true)
    public List<ImageGroupDto> getImages(String tag, List<String> tags, String type, Boolean favouritesOnly) {
        List<Image> images;
        if (Boolean.TRUE.equals(favouritesOnly)) {
            images = new ArrayList<>(imageRepository.findByFavouriteTrueOrderByTakenAtDesc());
        } else if (tag != null && !tag.isBlank()) {
            images = new ArrayList<>(imageRepository.findByTagNameOrderByTakenAtDesc(tag.toLowerCase()));
        } else {
            images = new ArrayList<>(imageRepository.findAllByOrderByTakenAtDesc());
        }

        if (tags != null && !tags.isEmpty()) {
            Set<String> wanted = tags.stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toSet());
            images = images.stream()
                    .filter(img -> img.getTags().stream()
                            .map(t -> t.getName().toLowerCase())
                            .collect(Collectors.toSet())
                            .containsAll(wanted))
                    .collect(Collectors.toList());
        }

        if (type != null && !type.isBlank()) {
            images = images.stream()
                    .filter(img -> type.equalsIgnoreCase(mediaType(img.getFilename())))
                    .collect(Collectors.toList());
        }

        return groupByDate(images);
    }

    public Map<String, Long> getMediaCounts() {
        return imageRepository.findAllByOrderByTakenAtDesc().stream()
                .map(img -> mediaType(img.getFilename()))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
    }

    private String mediaType(String filename) {
        String ext = extension(filename);
        return EXT_TO_MEDIA_TYPE.getOrDefault(ext, IMAGE_EXTS.contains(ext) ? null : ext.toUpperCase());
    }

    public String extension(String filename) {
        int i = filename.lastIndexOf('.');
        return i >= 0 ? filename.substring(i + 1).toLowerCase() : "";
    }

    public boolean isVideo(String filename) {
        return "Video".equals(EXT_TO_MEDIA_TYPE.get(extension(filename)));
    }

    /**
     * Visual content search — queries AI description, tag names, and filename.
     * Results are ranked: description matches first, tag matches second, filename last.
     * Only images that share the query in any of those three fields are returned.
     */
    @Transactional(readOnly = true)
    public List<ImageGroupDto> searchByContent(String q) {
        if (q == null || q.isBlank()) return List.of();
        String pattern = "%" + q.toLowerCase() + "%";

        // Merge results in priority order, deduplicating by ID
        Set<Long> seen = new LinkedHashSet<>();
        List<Image> results = new ArrayList<>();

        for (Image img : imageRepository.findByAiDescriptionContainingIgnoreCase(q)) {
            if (seen.add(img.getId())) results.add(img);
        }
        for (Image img : imageRepository.findByTagNameContainingIgnoreCase(pattern)) {
            if (seen.add(img.getId())) results.add(img);
        }
        for (Image img : imageRepository.findByFilenameContainingIgnoreCase(q)) {
            if (seen.add(img.getId())) results.add(img);
        }

        results.sort(Comparator.comparing(Image::getTakenAt).reversed());
        return groupByDate(results);
    }

    /** Returns IDs of images that have not yet received a visual description. */
    @Transactional(readOnly = true)
    public List<Long> getImagesWithoutDescription() {
        return imageRepository.findByAiDescriptionIsNull()
                .stream().map(Image::getId).toList();
    }

    /** True if any image failed Vision analysis due to an API error (quota/auth/etc). */
    @Transactional(readOnly = true)
    public boolean hasFailedDescriptions() {
        return !imageRepository.findByDescriptionStatus("FAILED").isEmpty();
    }

    /** Returns the first failure's error type among FAILED images, for messaging. */
    @Transactional(readOnly = true)
    public Optional<String> getMostRecentDescriptionErrorType() {
        return imageRepository.findByDescriptionStatus("FAILED").stream()
                .map(Image::getDescriptionError)
                .filter(Objects::nonNull)
                .findFirst();
    }

    private List<ImageGroupDto> groupByDate(List<Image> images) {
        LinkedHashMap<String, List<ImageDto>> grouped = new LinkedHashMap<>();
        for (Image image : images) {
            String date = image.getTakenAt().toLocalDate().toString();
            grouped.computeIfAbsent(date, k -> new ArrayList<>()).add(new ImageDto(image));
        }
        return grouped.entrySet().stream()
                .map(e -> new ImageGroupDto(e.getKey(), e.getValue()))
                .toList();
    }

    public Image getById(Long id) {
        return imageRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Image not found: " + id));
    }

    /** Pairs an open InputStream with the original filename (used to derive content-type). */
    public record StreamResult(InputStream stream, String filename) {}

    public StreamResult getFullImageStream(Long id) {
        Image image = getById(id);
        String storageKey = image.getS3Key() != null ? image.getS3Key() : image.getFilename();
        return new StreamResult(storageService.retrieveImage(storageKey), image.getFilename());
    }

    public StreamResult getThumbnailStream(Long id) {
        Image image = getById(id);
        return new StreamResult(storageService.retrieveThumbnail(image.getFilename()), image.getFilename());
    }

    @Transactional
    public ImageDto toggleFavourite(Long id) {
        Image image = getById(id);
        image.setFavourite(!image.isFavourite());
        return new ImageDto(imageRepository.save(image));
    }

    @Transactional
    public ImageDto addTag(Long imageId, String tagName) {
        Image image = getById(imageId);
        Tag tag = tagRepository.findByName(tagName)
                .orElseGet(() -> tagRepository.save(new Tag(tagName)));
        image.getTags().add(tag);
        return new ImageDto(imageRepository.save(image));
    }

    @Transactional
    public ImageDto removeTag(Long imageId, String tagName) {
        Image image = getById(imageId);
        image.getTags().removeIf(t -> t.getName().equals(tagName));
        ImageDto result = new ImageDto(imageRepository.save(image));
        imageRepository.flush();
        tagRepository.findByName(tagName).ifPresent(tag -> {
            if (tag.getImages().isEmpty()) tagRepository.delete(tag);
        });
        return result;
    }

    @Transactional
    public ImageDto uploadAndRegister(MultipartFile file, LocalDateTime takenAt) throws IOException {
        String filename = sanitizeFilename(Objects.requireNonNull(file.getOriginalFilename()));
        if (imageRepository.existsByFilename(filename)) {
            throw new IllegalArgumentException("Image already exists: " + filename);
        }

        byte[] thumbBytes;
        String storageKey;

        if (isVideo(filename)) {
            try (InputStream t = thumbnailService.generateVideoPlaceholder()) {
                thumbBytes = t.readAllBytes();
            }
            storageKey = storageService.storeImage(filename, file.getInputStream(), file.getSize(), file.getContentType());
        } else {
            byte[] bytes = file.getBytes();
            String format = thumbnailFormat(filename);
            try (InputStream t = thumbnailService.generateThumbnail(new ByteArrayInputStream(bytes), format)) {
                thumbBytes = t.readAllBytes();
            }
            storageKey = storageService.storeImage(filename, new ByteArrayInputStream(bytes), bytes.length, file.getContentType());
        }

        storageService.storeThumbnail(filename, new ByteArrayInputStream(thumbBytes), thumbBytes.length);
        Image image = new Image();
        image.setFilename(filename);
        image.setS3Key(storageKey);
        image.setTakenAt(takenAt != null ? takenAt : LocalDateTime.now());
        return new ImageDto(imageRepository.save(image));
    }

    @Transactional
    public void deleteImage(Long id) {
        Image image = getById(id);
        List<Tag> tags = new ArrayList<>(image.getTags());
        String storageKey = image.getS3Key() != null ? image.getS3Key() : image.getFilename();
        storageService.deleteImage(storageKey, image.getFilename());
        imageRepository.delete(image);
        imageRepository.flush();
        tags.forEach(tag -> {
            if (tag.getImages().isEmpty()) tagRepository.delete(tag);
        });
    }

    public boolean existsByFilename(String filename) {
        return imageRepository.existsByFilename(filename);
    }

    @Transactional
    public Image registerScannedImage(String filename, String storageKey, LocalDateTime takenAt) {
        Image image = new Image();
        image.setFilename(filename);
        image.setS3Key(storageKey);
        image.setTakenAt(takenAt);
        return imageRepository.save(image);
    }

    private String thumbnailFormat(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "png";
        if (lower.endsWith(".gif")) return "gif";
        if (lower.endsWith(".webp")) return "webp";
        return "jpeg";
    }

    public String sanitizeFilename(String original) {
        return Paths.get(original).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public String thumbnailFormatFor(String filename) {
        return thumbnailFormat(filename);
    }
}
