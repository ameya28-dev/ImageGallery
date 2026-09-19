"use client";

import { useState } from "react";

interface SearchBarProps {
  onFilterTag: (tag: string) => void;
  onFavouritesToggle: (enabled: boolean) => void;
  favouritesOnly: boolean;
  activeTag: string;
  onUpload: (file: File) => void;
  uploading: boolean;
}

export default function SearchBar({
  onFilterTag,
  onFavouritesToggle,
  favouritesOnly,
  activeTag,
  onUpload,
  uploading,
}: SearchBarProps) {
  const [tagInput, setTagInput] = useState("");

  const handleTagSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterTag(tagInput.trim().toLowerCase());
  };

  const clearTagFilter = () => {
    setTagInput("");
    onFilterTag("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Tag filter */}
      <form onSubmit={handleTagSearch} className="flex gap-2">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="Search by tag…"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Search
        </button>
        {activeTag && (
          <button
            type="button"
            onClick={clearTagFilter}
            className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
          >
            Clear
          </button>
        )}
      </form>

      {/* Favourites toggle */}
      <button
        onClick={() => onFavouritesToggle(!favouritesOnly)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
          favouritesOnly
            ? "border-pink-400 bg-pink-100 text-pink-700"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill={favouritesOnly ? "#ec4899" : "none"}
          stroke={favouritesOnly ? "#ec4899" : "currentColor"}
          strokeWidth={2}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        Favourites
      </button>

      {/* Upload button */}
      <label
        className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
          uploading
            ? "cursor-not-allowed opacity-50"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        {uploading ? "Uploading…" : "Upload"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
