"use client";

interface TagChipProps {
  name: string;
  onRemove?: (name: string) => void;
}

export default function TagChip({ name, onRemove }: TagChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-800 text-sm">
      {name}
      {onRemove && (
        <button
          onClick={() => onRemove(name)}
          aria-label={`Remove tag ${name}`}
          className="ml-1 text-gray-500 hover:text-gray-900 leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
}
