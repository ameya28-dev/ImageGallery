"use client";

import { useState, useRef } from "react";
import { Search, MoreVertical, X, Heart, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface GalleryHeaderProps {
  onSelectMode: () => void;
  onFavouritesToggle: () => void;
  favouritesOnly: boolean;
  onUpload: (files: File[]) => void;
  uploading: boolean;
}

/**
 * Top bar for normal (non-selection) gallery mode.
 * Guests see a read-only view with a single-file upload limit enforced by the backend.
 * The owner (authenticated) sees all management controls.
 */
export default function GalleryHeader({
  onSelectMode,
  onFavouritesToggle,
  favouritesOnly,
  onUpload,
  uploading,
}: GalleryHeaderProps) {
  const router = useRouter();
  const { isOwner, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onUpload(files);
    e.target.value = "";
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <div className="relative flex items-center justify-between px-4 py-3 sticky top-0 z-30 bg-black">
      {/* Left: active filter chips */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {favouritesOnly && (
          <span className="flex items-center gap-1 text-sm text-pink-400 bg-surface-2 px-3 py-1 rounded-full">
            Favourites
            <button onClick={onFavouritesToggle} aria-label="Clear favourites filter">
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      {/* Right: action icons */}
      <div className="flex items-center gap-5 flex-none">
        <button onClick={() => router.push("/search")} aria-label="Search">
          <Search size={22} />
        </button>
        <button onClick={onFavouritesToggle} aria-label={favouritesOnly ? "Show all" : "Show favourites"}>
          <Heart
            size={22}
            fill={favouritesOnly ? "#ec4899" : "none"}
            color={favouritesOnly ? "#ec4899" : "white"}
          />
        </button>
        <button onClick={() => setMenuOpen((v) => !v)} aria-label="More options">
          <MoreVertical size={22} />
        </button>
      </div>

      {/* Kebab dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-4 top-14 bg-surface-3 rounded-2xl py-2 z-50 min-w-[200px] shadow-xl">

            {/* Owner-only actions */}
            {isOwner && (
              <button
                onClick={() => { onSelectMode(); setMenuOpen(false); }}
                className="w-full text-left py-3 px-4 hover:bg-white/10 rounded-lg text-sm"
              >
                Select
              </button>
            )}

            {/* Upload — guests get single-file; owner gets multiple */}
            <label
              className={`flex w-full text-left py-3 px-4 hover:bg-white/10 rounded-lg text-sm cursor-pointer ${
                uploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {uploading
                ? "Uploading…"
                : isOwner
                  ? "Upload media"
                  : "Upload media (5/day)"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple={isOwner}   // guests get single-file picker
                className="sr-only"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>

            <div className="border-t border-white/10 my-1" />

            {/* Auth row */}
            {isOwner ? (
              <>
                <p className="px-4 py-2 text-xs text-gray-500 truncate">{user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-left py-3 px-4 hover:bg-white/10 rounded-lg text-sm text-red-400"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => { router.push("/login"); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 text-left py-3 px-4 hover:bg-white/10 rounded-lg text-sm text-blue-400"
              >
                <LogIn size={15} />
                Sign in
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
