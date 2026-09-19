package com.imagegallery.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ImageGroupDto {
  private final String date;
  private final List<ImageDto> images;
}
