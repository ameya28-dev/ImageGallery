"use client";

import { useState, useRef } from "react";
import { Search, MoreVertical, X, Heart, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import SignOutDialog from "@/components/ui/SignOutDialog";

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
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onUpload(files);
    e.target.value = "";
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setSignOutOpen(false);
    await logout();
    showToast("Signed out");
  };

  return (
    <div className="relative sticky top-0 z-30 flex items-center justify-between bg-black px-4 py-3">
      {/* Left: active filter chips */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {favouritesOnly && (
          <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-sm text-pink-400">
            Favourites
            <button
              onClick={onFavouritesToggle}
              aria-label="Clear favourites filter"
            >
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      {/* Right: action icons */}
      <div className="flex flex-none items-center gap-5">
        <button onClick={() => router.push("/search")} aria-label="Search">
          <Search size={22} />
        </button>
        <button
          onClick={onFavouritesToggle}
          aria-label={favouritesOnly ? "Show all" : "Show favourites"}
        >
          <Heart
            size={22}
            fill={favouritesOnly ? "#ec4899" : "none"}
            color={favouritesOnly ? "#ec4899" : "white"}
          />
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More options"
        >
          <MoreVertical size={22} />
        </button>
      </div>

      {/* Kebab dropdown */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-4 top-14 z-50 min-w-[200px] rounded-2xl bg-surface-3 py-2 shadow-xl">
            {/* Owner-only actions */}
            {isOwner && (
              <button
                onClick={() => {
                  onSelectMode();
                  setMenuOpen(false);
                }}
                className="w-full rounded-lg px-4 py-3 text-left text-sm hover:bg-white/10"
              >
                Select
              </button>
            )}

            {/* Upload — guests get single-file; owner gets multiple */}
            <label
              className={`flex w-full cursor-pointer rounded-lg px-4 py-3 text-left text-sm hover:bg-white/10 ${
                uploading ? "pointer-events-none opacity-50" : ""
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
                multiple={isOwner} // guests get single-file picker
                className="sr-only"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>

            <div className="my-1 border-t border-white/10" />

            {/* Auth row */}
            {isOwner ? (
              <>
                <p className="truncate px-4 py-2 text-xs text-gray-500">
                  {user?.email}
                </p>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setSignOutOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm text-red-400 hover:bg-white/10"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  router.push("/login");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm text-blue-400 hover:bg-white/10"
              >
                <LogIn size={15} />
                Sign in
              </button>
            )}
          </div>
        </>
      )}

      {/* Sign out confirmation dialog */}
      <SignOutDialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
