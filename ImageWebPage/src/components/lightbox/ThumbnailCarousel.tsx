"use client";

import { useRef, useEffect } from "react";
import { ImageDto } from "@/types";
import { AuthedImage } from "@/components/common/AuthedImage";

interface ThumbnailCarouselProps {
  images: ImageDto[];
  activeId: number;
  onSelect: (image: ImageDto) => void;
}

export default function ThumbnailCarousel({
  images,
  activeId,
  onSelect,
}: ThumbnailCarouselProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idx = images.findIndex((img) => img.id === activeId);
    const strip = stripRef.current;
    if (!strip || idx < 0) return;
    const thumb = strip.children[idx] as HTMLElement | undefined;
    if (!thumb) return;
    const stripRect = strip.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const scrollLeft =
      strip.scrollLeft +
      (thumbRect.left - stripRect.left) -
      (strip.clientWidth - thumb.offsetWidth) / 2;
    strip.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [activeId, images]);

  return (
    <div
      ref={stripRef}
      className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-3"
      style={{ paddingInline: "calc(50% - 28px)" }}
    >
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img)}
          className={`h-14 w-14 flex-none overflow-hidden rounded transition-opacity ${
            img.id === activeId
              ? "opacity-100 ring-2 ring-cyan-400"
              : "opacity-50"
          }`}
        >
          <AuthedImage
            id={img.id}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}
