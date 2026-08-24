package com.imagegallery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class ImageGroupDto {
    private final String date;
    private final List<ImageDto> images;
}
