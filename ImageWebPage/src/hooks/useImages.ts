"use client";

import {
  useState,
  useEffect,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import { ImageGroupDto } from "@/types";
import { fetchImages } from "@/lib/api";

interface UseImagesResult {
  groups: ImageGroupDto[];
  setGroups: Dispatch<SetStateAction<ImageGroupDto[]>>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useImages(): UseImagesResult {
  const [groups, setGroups] = useState<ImageGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchImages();
      setGroups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { groups, setGroups, loading, error, reload: load };
}
