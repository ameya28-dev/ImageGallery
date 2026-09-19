package com.imagegallery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TagDto {

  @NotBlank(message = "Tag name must not be blank")
  @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "Tag name must be alphanumeric")
  private String tag;
}
