package com.imagegallery.dto;

import com.imagegallery.model.Image;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;

@Getter
public class ImageDto {
  private final Long id;
  private final String filename;
  private final LocalDateTime takenAt;
  private final boolean favourite;
  private final List<String> tags;
  private final String thumbnailUrl;
  private final String fullUrl;

  public ImageDto(Image image) {
    this.id = image.getId();
    this.filename = image.getFilename();
    this.takenAt = image.getTakenAt();
    this.favourite = image.isFavourite();
    this.tags = image.getTags().stream().map(t -> t.getName()).sorted().toList();
    this.thumbnailUrl = "/api/images/" + image.getId() + "/thumbnail";
    this.fullUrl = "/api/images/" + image.getId() + "/full";
  }
}
