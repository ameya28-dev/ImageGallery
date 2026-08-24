"use client";

import { ImageGroupDto, ImageDto } from "@/types";
import { toggleFavourite } from "@/lib/api";

type SetGroups = React.Dispatch<React.SetStateAction<ImageGroupDto[]>>;

export function useFavourite(setGroups: SetGroups) {
  const toggle = async (imageId: number) => {
    // Optimistic update
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        images: group.images.map((img) =>
          img.id === imageId ? { ...img, favourite: !img.favourite } : img
        ),
      }))
    );

    try {
      const updated = await toggleFavourite(imageId);
      // Sync with server response
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          images: group.images.map((img) =>
            img.id === imageId ? { ...img, favourite: updated.favourite } : img
          ),
        }))
      );
    } catch {
      // Revert on failure
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          images: group.images.map((img) =>
            img.id === imageId ? { ...img, favourite: !img.favourite } : img
          ),
        }))
      );
    }
  };

  return { toggle };
}
