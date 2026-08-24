"use client";

import { useState, useEffect, useRef } from "react";
import { isAlphanumeric } from "@/lib/utils";

interface TagAutocompleteProps {
  suggestions: string[];
  onSearch: (q: string) => void;
  onSelect: (tag: string) => void;
  placeholder?: string;
}

export default function TagAutocomplete({
  suggestions,
  onSearch,
  onSelect,
  placeholder = "Add tag…",
}: TagAutocompleteProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      onSearch(value);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [value, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!isAlphanumeric(v)) {
      setError("Only letters and numbers allowed");
      return;
    }
    setError("");
    setValue(v);
  };

  const submit = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    onSelect(trimmed);
    setValue("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      submit(value);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s}
              onMouseDown={() => submit(s)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
