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

export default function InfoPanel({ image, onClose, onOpenTagDialog }: InfoPanelProps) {
  const router = useRouter();
  return (
    <div className="px-5 pt-5 pb-10 space-y-5">
      {/* Header row: title + close button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Info</p>
        <button onClick={onClose} aria-label="Close info panel" className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Date + filename */}
      <div>
        <p className="text-white font-semibold text-base">
          {formatDate(image.takenAt.slice(0, 10))}
        </p>
        <p className="text-gray-400 text-sm mt-1 break-all">{image.filename}</p>
      </div>

      {/* Tags */}
      <div>
        {image.tags.length === 0 ? (
          <button
            onClick={onOpenTagDialog}
            className="flex items-center gap-1.5 border border-gray-600 rounded-full px-3.5 py-1.5 text-sm text-gray-300 hover:border-gray-400 transition-colors"
          >
            <Hash size={13} />
            Add tag
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {image.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => router.push(`/search/results?tag=${encodeURIComponent(tag)}`)}
                className="flex items-center gap-1 border border-gray-600 rounded-full px-3 py-1 text-sm text-gray-300 hover:border-gray-400 transition-colors"
              >
                <Hash size={11} className="text-gray-500 flex-none" />
                {tag}
              </button>
            ))}
            <button
              onClick={onOpenTagDialog}
              aria-label="Edit tags"
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <Pencil size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
