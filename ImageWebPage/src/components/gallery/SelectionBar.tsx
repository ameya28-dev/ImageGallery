"use client";

import { Heart, Hash, Trash2 } from "lucide-react";

interface SelectionBarProps {
  count: number;
  onFavourite: () => void;
  onAddTag: () => void;
  onDelete: () => void;
}

/**
 * Sticky bottom action bar shown in selection mode when at least one image is selected.
 */
export default function SelectionBar({
  count,
  onFavourite,
  onAddTag,
  onDelete,
}: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-surface-1 py-4">
      <div className="mx-auto flex max-w-lg items-center justify-around px-8">
        <button
          onClick={onFavourite}
          className="flex flex-col items-center gap-1"
        >
          <Heart size={24} />
          <span className="text-xs text-gray-400">Favourite</span>
        </button>
        <button onClick={onAddTag} className="flex flex-col items-center gap-1">
          <Hash size={24} />
          <span className="text-xs text-gray-400">Add tag</span>
        </button>
        <button onClick={onDelete} className="flex flex-col items-center gap-1">
          <Trash2 size={24} />
          <span className="text-xs text-gray-400">Delete</span>
        </button>
      </div>
    </div>
  );
}
