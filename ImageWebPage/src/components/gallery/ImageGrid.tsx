import { ImageDto } from "@/types";
import ImageCard from "./ImageCard";

interface ImageGridProps {
  images: ImageDto[];
  selectionMode: boolean;
  selectedIds: Set<number>;
  onImagePress: (image: ImageDto) => void;
  onToggleFavourite: (id: number) => void;
}

export default function ImageGrid({
  images,
  selectionMode,
  selectedIds,
  onImagePress,
  onToggleFavourite,
}: ImageGridProps) {
  return (
    <div className="gallery-grid">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          selectionMode={selectionMode}
          selected={selectedIds.has(image.id)}
          onPress={onImagePress}
          onToggleFavourite={onToggleFavourite}
        />
      ))}
    </div>
  );
}
