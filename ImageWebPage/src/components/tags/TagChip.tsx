"use client";

interface TagChipProps {
  name: string;
  onRemove?: (name: string) => void;
}

export default function TagChip({ name, onRemove }: TagChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-sm text-gray-800">
      {name}
      {onRemove && (
        <button
          onClick={() => onRemove(name)}
          aria-label={`Remove tag ${name}`}
          className="ml-1 leading-none text-gray-500 hover:text-gray-900"
        >
          ×
        </button>
      )}
    </span>
  );
}
