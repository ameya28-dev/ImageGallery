"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, Play, Hash, ChevronRight, Heart, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { ImageDto, TagCountDto } from "@/types";
import { fetchMediaCounts, fetchTagsRanked, fetchTags, fetchSearchResults, thumbnailSrc } from "@/lib/api";

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
    Promise.all([fetchMediaCounts(), fetchTagsRanked(), fetchSearchResults({ favourites: true })]).then(
      ([counts, tags, favGroups]) => {
        setMediaCounts(counts);
        setRankedTags(tags);
        setFavouriteImages(favGroups.flatMap((g) => g.images));
      }
    );
  }, []);

  useEffect(() => {
    if (tagInput.length === 0) {
      setTagSuggestions([]);
      return;
    }
    fetchTags(tagInput).then(setTagSuggestions);
  }, [tagInput]);

  const shotTypes = Object.entries(mediaCounts)
    .sort(([, a], [, b]) => b - a);

  const visibleTags = rankedTags.slice(0, 12);

  const navigateToResults = (params: { tag?: string; type?: string; favourites?: boolean }) => {
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
        setHighlightedTagIndex((prev) => (prev < tagSuggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedTagIndex((prev) => (prev > 0 ? prev - 1 : tagSuggestions.length - 1));
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
        setVisualSearchError("Credits expired. Upgrade to continue visual search.");
      } else {
        setVisualSearchError("Search failed. Please try again.");
      }
    } finally {
      setVisualSearchLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black flex items-center gap-3 px-4 py-3 border-b border-neutral-900">
        <button onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-base font-semibold">Search</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-5 space-y-8">
        {/* Shot Types */}
        {shotTypes.length > 0 && (
          <section>
            <p className="text-base font-bold mb-3">
              Shot Types{" "}
              <span className="text-gray-400 font-normal text-sm ml-1">{shotTypes.length}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {shotTypes.map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => navigateToResults({ type })}
                  className="flex items-center gap-2 border border-gray-700 rounded-2xl px-4 py-3 text-left hover:border-gray-500 transition-colors"
                >
                  {type === "Video" ? (
                    <Play size={16} className="text-gray-400 flex-none" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400 border border-gray-600 rounded px-1 leading-5 flex-none">
                      {type}
                    </span>
                  )}
                  <span className="text-sm font-medium truncate">{type}</span>
                  <span className="text-sm text-gray-400 ml-auto flex-none">{count}</span>
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
              className="w-full flex items-center justify-between mb-3"
            >
              <p className="text-base font-bold">
                My Favourites{" "}
                <span className="text-gray-400 font-normal text-sm ml-1">{favouriteImages.length}</span>
              </p>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <div
              className="gallery-grid cursor-pointer"
              onClick={() => navigateToResults({ favourites: true })}
            >
              {favouriteImages.slice(0, 14).map((img, i) => (
                <div key={img.id} className={`img-cell${i >= 8 ? " hidden sm:block" : ""}`}>
                  <img src={thumbnailSrc(img.id)} alt={img.filename} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Tags */}
        {rankedTags.length > 0 && (
          <section>
            <p className="text-base font-bold mb-3">
              My Tags{" "}
              <span className="text-gray-400 font-normal text-sm ml-1">{rankedTags.length}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {visibleTags.map(({ name }) => (
                <button
                  key={name}
                  onClick={() => navigateToResults({ tag: name })}
                  className="flex items-center gap-1.5 border border-gray-700 rounded-full px-4 py-2 text-sm hover:border-gray-400 transition-colors truncate"
                >
                  <Hash size={12} className="text-gray-500 flex-none" />
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {rankedTags.length === 0 && shotTypes.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-16">
            No media or tags found. Upload some files to get started.
          </p>
        )}
      </div>

      {/* Bottom search bar — Tag search */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-900 px-4 pb-6 pt-3 space-y-3">
        {showTagSuggestions && tagSuggestions.length > 0 && (
          <div className="bg-neutral-800 rounded-xl overflow-hidden shadow-lg" role="listbox">
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
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                  highlightedTagIndex === idx
                    ? "bg-blue-600/80 text-white"
                    : "text-gray-200 hover:bg-white/10"
                }`}
              >
                <Hash size={12} className="text-gray-500 flex-none" />
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 bg-neutral-900 rounded-2xl px-4 py-3">
          <Hash size={18} className="text-gray-500 flex-none" />
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
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm"
            role="combobox"
            aria-expanded={showTagSuggestions && tagSuggestions.length > 0}
            aria-autocomplete="list"
          />
        </div>

        {/* Visual Search Button */}
        <button
          onClick={() => setShowVisualModal(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl px-4 py-3 font-semibold text-white flex items-center justify-center gap-2 transition-all"
        >
          <Zap size={18} />
          Visual Search
        </button>

        {/* Visual Search Modal */}
        {showVisualModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end">
            <div className="w-full bg-black border-t border-neutral-900 rounded-t-3xl p-6 space-y-4 max-h-1/2 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Describe what you're looking for</h2>
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
                className="w-full bg-neutral-900 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              {visualSearchError && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-200">
                  {visualSearchError}
                </div>
              )}

              <button
                onClick={handleVisualSearch}
                disabled={visualSearchLoading || !visualInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-gray-500 rounded-xl px-4 py-3 font-semibold text-white transition-colors"
              >
                {visualSearchLoading ? "Searching..." : "Search"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Uses AI to search by image content, not just tags
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
