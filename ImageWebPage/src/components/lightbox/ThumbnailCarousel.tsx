"use client";

import { useRef, useEffect } from "react";
import { ImageDto } from "@/types";
import { AuthedImage } from "@/components/common/AuthedImage";

interface ThumbnailCarouselProps {
  images: ImageDto[];
  activeId: number;
  onSelect: (image: ImageDto) => void;
}

export default function ThumbnailCarousel({ images, activeId, onSelect }: ThumbnailCarouselProps) {
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
      strip.scrollLeft + (thumbRect.left - stripRect.left) - (strip.clientWidth - thumb.offsetWidth) / 2;
    strip.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [activeId, images]);

  return (
    <div
      ref={stripRef}
      className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-3"
      style={{ paddingInline: "calc(50% - 28px)" }}
    >
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img)}
          className={`flex-none w-14 h-14 rounded overflow-hidden transition-opacity ${
            img.id === activeId ? "ring-2 ring-cyan-400 opacity-100" : "opacity-50"
          }`}
        >
          <AuthedImage
            id={img.id}
            alt=""
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}
