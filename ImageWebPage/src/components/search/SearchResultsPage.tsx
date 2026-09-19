"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Hash, Heart, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageDto, ImageGroupDto } from "@/types";
import { fetchSearchResults, deleteImage, ApiError } from "@/lib/api";
import { useFavourite } from "@/hooks/useFavourite";
import { useTags } from "@/hooks/useTags";
import DateGroup from "@/components/gallery/DateGroup";
import Lightbox from "@/components/lightbox/Lightbox";

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** Visual content search query — when present, backend searches AI descriptions. */
  const q = searchParams.get("q") ?? undefined;
  const tags = useMemo(() => searchParams.getAll("tag"), [searchParams]);
  const type = searchParams.get("type");
  const favourites = searchParams.get("favourites") === "true";

  const [groups, setGroups] = useState<ImageGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<ImageDto | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);

  const { toggle: toggleFavourite } = useFavourite(setGroups);
  const {
    add: addTag,
    remove: removeTag,
    suggestions: tagSuggestions,
    loadSuggestions,
  } = useTags(setGroups);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchSearchResults({
      q,
      tags: tags.length ? tags : undefined,
      type: type ?? undefined,
      favourites: favourites || undefined,
    })
      .then(setGroups)
      .catch((err) => {
        // Handle API errors with granular messages
        if (err instanceof ApiError) {
          const message = formatErrorMessage(
            err.errorType,
            err.details?.message || err.message,
          );
          setError(message);
        } else if (err instanceof Error) {
          setError(err.message || "Search failed. Please try again.");
        } else {
          setError("Search failed. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [q, tags, type, favourites]);

  const allImages = useMemo(() => groups.flatMap((g) => g.images), [groups]);
  const totalCount = allImages.length;

  // Suggestions derived from the current result set — narrows as filters are added
  const suggestions = useMemo(() => {
    if (tagInput.length === 0) return [];
    const prefix = tagInput.toLowerCase();
    const activeTagSet = new Set(tags);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const img of allImages) {
      for (const t of img.tags) {
        if (
          !seen.has(t) &&
          !activeTagSet.has(t) &&
          t.toLowerCase().includes(prefix)
        ) {
          seen.add(t);
          result.push(t);
        }
      }
    }
    return result;
  }, [tagInput, allImages, tags]);

  const updateUrl = useCallback(
    (newTags: string[], newType: string | null, newFavourites: boolean) => {
      const p = new URLSearchParams();
      // Preserve visual search query when adding/removing tag/type/favourites chips
      if (q) p.set("q", q);
      newTags.forEach((t) => p.append("tag", t));
      if (newType) p.set("type", newType);
      if (newFavourites) p.set("favourites", "true");
      const qs = p.toString();
      if (!qs) {
        router.back();
        return;
      }
      router.replace(`/search/results?${qs}`);
    },
    [router, q],
  );

  const removeTagFilter = (t: string) =>
    updateUrl(
      tags.filter((x) => x !== t),
      type,
      favourites,
    );
  const removeTypeFilter = () => updateUrl(tags, null, favourites);
  const removeFavouritesFilter = () => updateUrl(tags, type, false);

  const addTagFilter = (t: string) => {
    if (!tags.includes(t)) updateUrl([...tags, t], type, favourites);
    setTagInput("");
    setHighlightedTagIndex(-1);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") setShowSuggestions(false);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedTagIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedTagIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedTagIndex >= 0) {
          addTagFilter(suggestions[highlightedTagIndex]);
        } else if (tagInput.trim()) {
          addTagFilter(tagInput.trim());
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedTagIndex(-1);
        break;
    }
  };

  const handleDeleteImage = useCallback(async (id: number) => {
    await deleteImage(id);
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, images: g.images.filter((img) => img.id !== id) }))
        .filter((g) => g.images.length > 0),
    );
  }, []);

  /**
   * Formats API error messages for display to users.
   * Translates error types into user-friendly messages.
   */
  const formatErrorMessage = (
    errorType: string | undefined,
    backendMessage: string,
  ): string => {
    switch (errorType) {
      case "QUOTA_EXCEEDED":
        return "Visual search quota exceeded. Upgrade your plan to continue searching by image content.";
      case "AUTHENTICATION_FAILED":
        return "API key is invalid or expired. Please contact support.";
      case "INVALID_REQUEST":
        return "Your search query could not be processed. Try a different description.";
      case "TRANSIENT_ERROR":
        return "Temporary service issue. Please try again in a moment.";
      default:
        return backendMessage || "Search failed. Please try again.";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-900 bg-black px-4 py-3">
        <button onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-base font-semibold">Search Results</h1>
      </div>

      {/* Visual search query indicator */}
      {q && (
        <div className="flex items-center gap-2 px-4 pb-1 pt-3">
          <Search size={13} className="flex-none text-blue-400" />
          <span className="truncate text-sm font-medium text-blue-400">
            "{q}"
          </span>
        </div>
      )}

      {/* Item count */}
      {!loading && (
        <p className="px-4 pb-1 pt-1 text-sm text-gray-400">
          {totalCount} {totalCount === 1 ? "item" : "items"}
        </p>
      )}

      {/* Gallery */}
      <div className="flex-1 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center px-6 py-24">
            <div className="max-w-sm space-y-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => router.back()}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Go back and try again
              </button>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-gray-400">No results found</p>
          </div>
        ) : (
          groups.map((group) => (
            <DateGroup
              key={group.date}
              group={group}
              selectionMode={false}
              selectedIds={new Set()}
              onImagePress={setLightboxImage}
              onSelectGroup={() => {}}
              onToggleFavourite={toggleFavourite}
            />
          ))
        )}
      </div>

      {/* Bottom filter bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-900 bg-black px-4 pb-6 pt-3">
        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            className="mb-2 overflow-hidden rounded-xl bg-neutral-800 shadow-lg"
            role="listbox"
          >
            {suggestions.slice(0, 5).map((tag, idx) => (
              <button
                key={tag}
                role="option"
                aria-selected={highlightedTagIndex === idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTagFilter(tag);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                  highlightedTagIndex === idx
                    ? "bg-blue-600/80 text-white"
                    : "text-gray-200 hover:bg-white/10"
                }`}
              >
                <Hash size={12} className="flex-none text-gray-500" />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Active chips + input */}
        <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-2xl bg-neutral-900 px-3 py-2.5">
          {favourites && (
            <span className="flex flex-none items-center gap-1 rounded-full bg-neutral-700 px-3 py-1 text-sm">
              <Heart
                size={11}
                className="flex-none fill-pink-400 text-pink-400"
              />
              Favourites
              <button
                onClick={removeFavouritesFilter}
                aria-label="Remove favourites filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {type && (
            <span className="flex flex-none items-center gap-1 rounded-full bg-neutral-700 px-3 py-1 text-sm">
              {type}
              <button
                onClick={removeTypeFilter}
                aria-label={`Remove ${type} filter`}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {tags.map((t) => (
            <span
              key={t}
              className="flex flex-none items-center gap-1 rounded-full bg-neutral-700 px-3 py-1 text-sm"
            >
              <Hash size={11} className="text-gray-400" />
              {t}
              <button
                onClick={() => removeTagFilter(t)}
                aria-label={`Remove ${t} filter`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setHighlightedTagIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleTagKeyDown}
            placeholder={
              tags.length === 0 && !type && !q ? "Filter by tag…" : "Add tag…"
            }
            className="min-w-[80px] flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-autocomplete="list"
          />
        </div>
      </div>

      <Lightbox
        image={lightboxImage}
        allImages={allImages}
        onClose={() => setLightboxImage(null)}
        onToggleFavourite={toggleFavourite}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onDelete={handleDeleteImage}
        tagSuggestions={tagSuggestions}
        onLoadTagSuggestions={loadSuggestions}
      />
    </div>
  );
}
