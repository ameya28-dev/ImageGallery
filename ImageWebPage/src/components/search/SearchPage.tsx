"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Search,
  Play,
  Hash,
  ChevronRight,
  Heart,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ImageDto, TagCountDto } from "@/types";
import {
  fetchMediaCounts,
  fetchTagsRanked,
  fetchTags,
  fetchSearchResults,
} from "@/lib/api";
import { AuthedImage } from "@/components/common/AuthedImage";

export default function SearchPage() {
  const router = useRouter();
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
  const [rankedTags, setRankedTags] = useState<TagCountDto[]>([]);
  const [favouriteImages, setFavouriteImages] = useState<ImageDto[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
  const [visualInput, setVisualInput] = useState("");
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [visualSearchError, setVisualSearchError] = useState("");
  const [visualSearchLoading, setVisualSearchLoading] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const visualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetchMediaCounts(),
      fetchTagsRanked(),
      fetchSearchResults({ favourites: true }),
    ]).then(([counts, tags, favGroups]) => {
      setMediaCounts(counts);
      setRankedTags(tags);
      setFavouriteImages(favGroups.flatMap((g) => g.images));
    });
  }, []);

  useEffect(() => {
    if (tagInput.length === 0) {
      setTagSuggestions([]);
      return;
    }
    fetchTags(tagInput).then(setTagSuggestions);
  }, [tagInput]);

  const shotTypes = Object.entries(mediaCounts).sort(([, a], [, b]) => b - a);

  const visibleTags = rankedTags.slice(0, 12);

  const navigateToResults = (params: {
    tag?: string;
    type?: string;
    favourites?: boolean;
  }) => {
    const p = new URLSearchParams();
    if (params.tag) p.set("tag", params.tag);
    if (params.type) p.set("type", params.type);
    if (params.favourites) p.set("favourites", "true");
    router.push(`/search/results?${p}`);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showTagSuggestions || tagSuggestions.length === 0) {
      if (e.key === "Escape") setShowTagSuggestions(false);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedTagIndex((prev) =>
          prev < tagSuggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedTagIndex((prev) =>
          prev > 0 ? prev - 1 : tagSuggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedTagIndex >= 0) {
          navigateToResults({ tag: tagSuggestions[highlightedTagIndex] });
          setTagInput("");
          setHighlightedTagIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowTagSuggestions(false);
        setHighlightedTagIndex(-1);
        break;
    }
  };

  const handleVisualSearch = async () => {
    const clean = visualInput.trim();
    if (!clean) return;

    setVisualSearchLoading(true);
    setVisualSearchError("");

    try {
      router.push(`/search/results?q=${encodeURIComponent(clean)}`);
      setShowVisualModal(false);
      setVisualInput("");
    } catch (err) {
      if (err instanceof Error && err.message.includes("Credits")) {
        setVisualSearchError(
          "Credits expired. Upgrade to continue visual search.",
        );
      } else {
        setVisualSearchError("Search failed. Please try again.");
      }
    } finally {
      setVisualSearchLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-900 bg-black px-4 py-3">
        <button onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-base font-semibold">Search</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 space-y-8 overflow-y-auto px-4 pb-28 pt-5">
        {/* Shot Types */}
        {shotTypes.length > 0 && (
          <section>
            <p className="mb-3 text-base font-bold">
              Shot Types{" "}
              <span className="ml-1 text-sm font-normal text-gray-400">
                {shotTypes.length}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shotTypes.map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => navigateToResults({ type })}
                  className="flex items-center gap-2 rounded-2xl border border-gray-700 px-4 py-3 text-left transition-colors hover:border-gray-500"
                >
                  {type === "Video" ? (
                    <Play size={16} className="flex-none text-gray-400" />
                  ) : (
                    <span className="flex-none rounded border border-gray-600 px-1 text-xs font-bold leading-5 text-gray-400">
                      {type}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium">{type}</span>
                  <span className="ml-auto flex-none text-sm text-gray-400">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* My Favourites */}
        {favouriteImages.length > 0 && (
          <section>
            <button
              onClick={() => navigateToResults({ favourites: true })}
              className="mb-3 flex w-full items-center justify-between"
            >
              <p className="text-base font-bold">
                My Favourites{" "}
                <span className="ml-1 text-sm font-normal text-gray-400">
                  {favouriteImages.length}
                </span>
              </p>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <div
              className="gallery-grid cursor-pointer"
              onClick={() => navigateToResults({ favourites: true })}
            >
              {favouriteImages.slice(0, 14).map((img, i) => (
                <div
                  key={img.id}
                  className={`img-cell${i >= 8 ? "hidden sm:block" : ""}`}
                >
                  <AuthedImage id={img.id} alt={img.filename} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Tags */}
        {rankedTags.length > 0 && (
          <section>
            <p className="mb-3 text-base font-bold">
              My Tags{" "}
              <span className="ml-1 text-sm font-normal text-gray-400">
                {rankedTags.length}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {visibleTags.map(({ name }) => (
                <button
                  key={name}
                  onClick={() => navigateToResults({ tag: name })}
                  className="flex items-center gap-1.5 truncate rounded-full border border-gray-700 px-4 py-2 text-sm transition-colors hover:border-gray-400"
                >
                  <Hash size={12} className="flex-none text-gray-500" />
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {rankedTags.length === 0 && shotTypes.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-500">
            No media or tags found. Upload some files to get started.
          </p>
        )}
      </div>

      {/* Bottom search bar — Tag search */}
      <div className="fixed bottom-0 left-0 right-0 space-y-3 border-t border-neutral-900 bg-black px-4 pb-6 pt-3">
        {showTagSuggestions && tagSuggestions.length > 0 && (
          <div
            className="overflow-hidden rounded-xl bg-neutral-800 shadow-lg"
            role="listbox"
          >
            {tagSuggestions.slice(0, 6).map((tag, idx) => (
              <button
                key={tag}
                role="option"
                aria-selected={highlightedTagIndex === idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigateToResults({ tag });
                  setTagInput("");
                  setHighlightedTagIndex(-1);
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
        <div className="flex items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3">
          <Hash size={18} className="flex-none text-gray-500" />
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setHighlightedTagIndex(-1);
            }}
            onFocus={() => setShowTagSuggestions(true)}
            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
            onKeyDown={handleTagKeyDown}
            placeholder="Search by tag…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            role="combobox"
            aria-expanded={showTagSuggestions && tagSuggestions.length > 0}
            aria-autocomplete="list"
          />
        </div>

        {/* Visual Search Button */}
        <button
          onClick={() => setShowVisualModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white transition-all hover:from-blue-700 hover:to-blue-800"
        >
          <Zap size={18} />
          Visual Search
        </button>

        {/* Visual Search Modal */}
        {showVisualModal && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
            <div className="max-h-1/2 w-full space-y-4 overflow-y-auto rounded-t-3xl border-t border-neutral-900 bg-black p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  Describe what you're looking for
                </h2>
                <button
                  onClick={() => setShowVisualModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <input
                ref={visualInputRef}
                type="text"
                value={visualInput}
                onChange={(e) => setVisualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVisualSearch()}
                placeholder="e.g., 'sunset over ocean', 'rocket launching', 'people at beach'…"
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              {visualSearchError && (
                <div className="rounded-xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
                  {visualSearchError}
                </div>
              )}

              <button
                onClick={handleVisualSearch}
                disabled={visualSearchLoading || !visualInput.trim()}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-gray-500"
              >
                {visualSearchLoading ? "Searching..." : "Search"}
              </button>

              <p className="text-center text-xs text-gray-500">
                Uses AI to search by image content, not just tags
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
