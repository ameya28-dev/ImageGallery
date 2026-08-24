"use client";

interface HeartButtonProps {
  favourite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: number;
}

export default function HeartButton({ favourite, onToggle, size = 24 }: HeartButtonProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(e); }}
      aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
      className="p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={favourite ? "#ec4899" : "none"}
        stroke={favourite ? "#ec4899" : "white"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
