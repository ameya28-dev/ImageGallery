import { ImageDto, ImageGroupDto } from "@/types";
import { groupDateLabel } from "@/lib/utils";
import ImageGrid from "./ImageGrid";

interface DateGroupProps {
  group: ImageGroupDto;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onImagePress: (image: ImageDto) => void;
  onSelectGroup: (group: ImageGroupDto) => void;
  onToggleFavourite: (id: number) => void;
}

export default function DateGroup({
  group,
  selectionMode,
  selectedIds,
  onImagePress,
  onSelectGroup,
  onToggleFavourite,
}: DateGroupProps) {
  const allSelected =
    group.images.length > 0 && group.images.every((img) => selectedIds.has(img.id));

  return (
    <section>
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-lg font-semibold text-white">{groupDateLabel(group.date)}</h2>
        {selectionMode && (
          <button
            onClick={() => onSelectGroup(group)}
            aria-label={allSelected ? "Deselect group" : "Select group"}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              allSelected ? "bg-cyan-400 border-cyan-400" : "border-gray-400"
            }`}
          >
            {allSelected && (
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
          </button>
        )}
      </div>
      <ImageGrid
        images={group.images}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onImagePress={onImagePress}
        onToggleFavourite={onToggleFavourite}
      />
    </section>
  );
}
