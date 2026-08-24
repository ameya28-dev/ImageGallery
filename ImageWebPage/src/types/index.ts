export interface ImageDto {
  id: number;
  filename: string;
  takenAt: string;
  favourite: boolean;
  tags: string[];
  thumbnailUrl: string;
  fullUrl: string;
}

export interface ImageGroupDto {
  date: string;
  images: ImageDto[];
}

export interface TagCountDto {
  name: string;
  count: number;
}
