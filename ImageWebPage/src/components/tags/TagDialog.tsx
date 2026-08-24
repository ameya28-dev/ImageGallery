"use client";

import { useState, useRef, useEffect } from "react";
import { Hash, Plus } from "lucide-react";
import BottomSheet from "@/components/ui/BottomSheet";
import { ImageDto } from "@/types";

interface TagDialogProps {
  image: ImageDto | null;
  open: boolean;
  onClose: () => void;
  onAddTag: (imageId: number, tag: string) => Promise<void>;
  onRemoveTag: (imageId: number, tag: string) => Promise<void>;
  suggestions: string[];
  onLoadSuggestions: (prefix: string) => void;
  /** When provided, the sheet overlays only this container (desktop sidebar mode). */
  container?: Element | null;
}

export default function TagDialog({
  image,
  open,
  onClose,
  onAddTag,
  onRemoveTag,
  suggestions,
  onLoadSuggestions,
  container,
}: TagDialogProps) {
  const [pendingTags, setPendingTags] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Long-press state — shared across all tag buttons
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivated = useRef(false);

  useEffect(() => {
    if (open && image) {
      setPendingTags(new Set(image.tags));
      setInput("");
      onLoadSuggestions("");
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open, image?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup any pending long-press timer when dialog unmounts
  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  const toggleTag = (tag: string) => {
    setPendingTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  // ── Long-press helpers ───────────────────────────────────────────────────
  const startLongPress = (tag: string) => {
    longPressActivated.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true;
      toggleTag(tag);
      setInput(tag);
      setTimeout(() => inputRef.current?.focus(), 0);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTagClick = (tag: string) => {
    if (longPressActivated.current) {
      longPressActivated.current = false;
      return; // long-press already handled the action
    }
    toggleTag(tag);
  };
  // ────────────────────────────────────────────────────────────────────────

  const handleInputChange = (value: string) => {
    setInput(value.replace(/[^a-zA-Z0-9]/g, ""));
  };

  const commitTag = (raw: string) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "");
    if (!clean) return;
    setPendingTags((prev) => new Set([...prev, clean]));
    setInput("");
  };

  const handleSave = async () => {
    if (!image) return;
    setSaving(true);
    try {
      const originalTags = new Set(image.tags);
      const toAdd = [...pendingTags].filter((t) => !originalTags.has(t));
      const toRemove = [...originalTags].filter((t) => !pendingTags.has(t));
      for (const tag of toAdd) await onAddTag(image.id, tag);
      for (const tag of toRemove) await onRemoveTag(image.id, tag);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!image) return null;

  // Blue pills: currently selected (in pendingTags)
  // Gray pills: original tags that the user has deselected — stay visible so they can be re-selected
  const selectedTags = [...pendingTags].sort();
  const deselectedOriginalTags = image.tags.filter((t) => !pendingTags.has(t)).sort();

  // Autocomplete: substring match, case-insensitive, excludes already-pending, max 6
  const autocomplete = input.length > 0
    ? suggestions
        .filter((s) => !pendingTags.has(s) && s.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 6)
    : [];

  // Shared pointer-event props for each tag pill
  const tagPointerProps = (tag: string) => ({
    onPointerDown: () => startLongPress(tag),
    onPointerUp: cancelLongPress,
    onPointerLeave: cancelLongPress,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // suppress native context menu
  });

  return (
    <BottomSheet open={open} onClose={onClose} container={container}>
      <div className="px-5 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold">Tags</h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-blue-400 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Tag pills — show both selected (blue) and deselected originals (gray) */}
        {(selectedTags.length > 0 || deselectedOriginalTags.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-5 select-none">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                {...tagPointerProps(tag)}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors"
                title="Click to deselect · Hold to edit"
              >
                <Hash size={12} />
                {tag}
              </button>
            ))}
            {deselectedOriginalTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                {...tagPointerProps(tag)}
                className="flex items-center gap-1.5 border border-gray-600 text-gray-400 px-3.5 py-1.5 rounded-full text-sm transition-colors hover:border-gray-400"
                title="Click to re-select · Hold to edit"
              >
                <Hash size={12} className="text-gray-500" />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Input + autocomplete */}
        <div className="border-t border-gray-700 pt-4 relative">
          {/* Autocomplete dropdown — floats above the input */}
          {autocomplete.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-neutral-800 rounded-xl overflow-hidden shadow-lg">
              {autocomplete.map((tag) => (
                <button
                  key={tag}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before click fires
                    setInput(tag);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
                >
                  <Plus size={12} className="text-gray-500 flex-none" />
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Hash size={16} className="text-gray-500 flex-none" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (autocomplete.length > 0) {
                    commitTag(autocomplete[0]);
                  } else if (input) {
                    commitTag(input);
                  }
                }
                if (e.key === "Escape" && input) {
                  e.stopPropagation();
                  setInput("");
                }
              }}
              placeholder="Create new tag"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm"
            />
            {input && (
              <button
                onClick={() => commitTag(input)}
                className="text-blue-400 flex-none"
                aria-label="Add tag"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
