"use client";

import { useEffect, useState } from "react";
import { fetchThumbnailBlob, thumbnailSrc } from "@/lib/api";

interface AuthedImageProps {
  id: number;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Image component that handles both authenticated and unauthenticated thumbnail fetching.
 * - Under local profile (guest access allowed): falls back to direct thumbnailSrc() URL
 * - Under feature profile (auth required): fetches blob with Bearer token, returns object URL
 * - Automatically revokes blob URLs on unmount or id change
 */
export function AuthedImage({ id, alt, className, loading }: AuthedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const loadBlob = async () => {
      try {
        const url = await fetchThumbnailBlob(id);
        if (isMounted) {
          objectUrl = url;
          setBlobUrl(url);
          setError(false);
        }
      } catch {
        if (isMounted) {
          // Fall back to direct URL (works under local with guest access)
          setBlobUrl(thumbnailSrc(id));
          setError(true);
        }
      }
    };

    loadBlob();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id]);

  return (
    <img
      src={blobUrl || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
}
