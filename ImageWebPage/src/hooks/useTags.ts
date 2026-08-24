"use client";

import { useState, useCallback } from "react";
import { ImageGroupDto } from "@/types";
import { addTag, removeTag, fetchTags } from "@/lib/api";

type SetGroups = React.Dispatch<React.SetStateAction<ImageGroupDto[]>>;

export function useTags(setGroups: SetGroups) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const updateGroupsFromTag = (imageId: number, newTags: string[], setter: SetGroups) => {
    setter((prev) =>
      prev.map((group) => ({
        ...group,
        images: group.images.map((img) =>
          img.id === imageId ? { ...img, tags: newTags } : img
        ),
      }))
    );
  };

  const add = async (imageId: number, tag: string) => {
    const updated = await addTag(imageId, tag);
    updateGroupsFromTag(imageId, updated.tags, setGroups);
  };

  const remove = async (imageId: number, tagName: string) => {
    const updated = await removeTag(imageId, tagName);
    updateGroupsFromTag(imageId, updated.tags, setGroups);
  };

  const loadSuggestions = useCallback(async (prefix: string) => {
    const results = await fetchTags(prefix || undefined);
    setSuggestions(results);
  }, []);

  return { add, remove, suggestions, loadSuggestions };
}
