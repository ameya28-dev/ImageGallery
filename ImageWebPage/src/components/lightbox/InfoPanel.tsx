"use client";

import { X, Hash, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { ImageDto } from "@/types";
import { formatDate } from "@/lib/utils";

interface InfoPanelProps {
  image: ImageDto;
  onClose: () => void;
  onOpenTagDialog: () => void;
}

export default function InfoPanel({
  image,
  onClose,
  onOpenTagDialog,
}: InfoPanelProps) {
  const router = useRouter();
  return (
    <div className="space-y-5 px-5 pb-10 pt-5">
      {/* Header row: title + close button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Info
        </p>
        <button
          onClick={onClose}
          aria-label="Close info panel"
          className="text-gray-400 transition-colors hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Date + filename */}
      <div>
        <p className="text-base font-semibold text-white">
          {formatDate(image.takenAt.slice(0, 10))}
        </p>
        <p className="mt-1 break-all text-sm text-gray-400">{image.filename}</p>
      </div>

      {/* Tags */}
      <div>
        {image.tags.length === 0 ? (
          <button
            onClick={onOpenTagDialog}
            className="flex items-center gap-1.5 rounded-full border border-gray-600 px-3.5 py-1.5 text-sm text-gray-300 transition-colors hover:border-gray-400"
          >
            <Hash size={13} />
            Add tag
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {image.tags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  router.push(`/search/results?tag=${encodeURIComponent(tag)}`)
                }
                className="flex items-center gap-1 rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-colors hover:border-gray-400"
              >
                <Hash size={11} className="flex-none text-gray-500" />
                {tag}
              </button>
            ))}
            <button
              onClick={onOpenTagDialog}
              aria-label="Edit tags"
              className="p-1 text-gray-400 transition-colors hover:text-white"
            >
              <Pencil size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
