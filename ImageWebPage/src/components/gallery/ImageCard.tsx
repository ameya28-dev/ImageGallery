"use client";

import { Heart, Hash } from "lucide-react";
import { ImageDto } from "@/types";
import { AuthedImage } from "@/components/common/AuthedImage";

interface ImageCardProps {
  image: ImageDto;
  selectionMode: boolean;
  selected: boolean;
  onPress: (image: ImageDto) => void;
  onToggleFavourite: (id: number) => void;
}

export default function ImageCard({
  image,
  selectionMode,
  selected,
  onPress,
  onToggleFavourite,
}: ImageCardProps) {
  return (
    <div className="img-cell" onClick={() => onPress(image)}>
      <AuthedImage id={image.id} alt={image.filename} loading="lazy" />

      {/* Heart toggle — top-right, 10 px padding, always visible */}
      {!selectionMode && (
        <button
          className="img-heart"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite(image.id);
          }}
          aria-label={
            image.favourite ? "Remove from favourites" : "Add to favourites"
          }
        >
          <Heart
            size={14}
            fill={image.favourite ? "#ec4899" : "none"}
            color={image.favourite ? "#ec4899" : "rgba(255,255,255,0.85)"}
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}
          />
        </button>
      )}

      {/* Tag badge — bottom-left, hidden in selection mode */}
      {!selectionMode && (
        <div className="pointer-events-none absolute bottom-1.5 left-1.5">
          {image.tags.length > 0 ? (
            /* Tagged: dark pill with count */
            <span
              className="flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 leading-none text-white/90 backdrop-blur-sm"
              style={{ fontSize: 9 }}
            >
              <Hash size={7} className="flex-none" />
              {image.tags.length}
            </span>
          ) : (
            /* Untagged: amber dot — "needs tagging" */
            <span
              className="flex items-center rounded-full bg-amber-400/90 px-1 py-0.5 leading-none text-black"
              title="No tags yet"
              style={{ fontSize: 9 }}
            >
              <Hash size={7} className="flex-none" />
            </span>
          )}
        </div>
      )}

      {/* Selection circle — replaces heart in selection mode */}
      {selectionMode && (
        <div
          className={`img-select ${
            selected
              ? "border-cyan-400 bg-cyan-400"
              : "border-white bg-black/30"
          }`}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
