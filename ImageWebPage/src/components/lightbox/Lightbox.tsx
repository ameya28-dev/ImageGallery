"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Heart, Info, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { ImageDto } from "@/types";
import { fullSrc, thumbnailSrc } from "@/lib/api";
import ThumbnailCarousel from "./ThumbnailCarousel";
import InfoPanel from "./InfoPanel";
import DeleteDialog from "./DeleteDialog";
import TagDialog from "@/components/tags/TagDialog";

interface LightboxProps {
  image: ImageDto | null;
  allImages: ImageDto[];
  onClose: () => void;
  onToggleFavourite: (id: number) => Promise<void>;
  onAddTag: (id: number, tag: string) => Promise<void>;
  onRemoveTag: (id: number, tag: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  tagSuggestions: string[];
  onLoadTagSuggestions: (prefix: string) => void;
}

export default function Lightbox({
  image,
  allImages,
  onClose,
  onToggleFavourite,
  onAddTag,
  onRemoveTag,
  onDelete,
  tagSuggestions,
  onLoadTagSuggestions,
}: LightboxProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<number>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Used as portal target for TagDialog on desktop so it stays within the panel width
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const lastTapTimeRef = useRef<number>(0);

  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      // Enter fullscreen
      try {
        const elem = imageAreaRef.current || document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.error("Fullscreen request failed:", err);
      }
    } else {
      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  const handleImageDoubleClick = useCallback(() => {
    toggleFullscreen();
  }, [toggleFullscreen]);

  const handleImageClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      // Double tap detected
      toggleFullscreen();
    }
    lastTapTimeRef.current = now;
  }, [toggleFullscreen]);

  useEffect(() => {
    if (image) {
      setActiveId(image.id);
      setShowInfo(false);
      setShowTagDialog(false);
      setShowDeleteDialog(false);
      if (isFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, [image?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for fullscreen changes (e.g., ESC key pressed)
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const activeImage = allImages.find((img) => img.id === activeId) ?? null;
  const isOpen = image !== null && activeImage !== null;

  const navigate = useCallback(
    (delta: number) => {
      if (!activeId || allImages.length === 0) return;
      const idx = allImages.findIndex((img) => img.id === activeId);
      const nextIdx = (idx + delta + allImages.length) % allImages.length;
      setActiveId(allImages[nextIdx].id);
    },
    [activeId, allImages],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!activeImage) return;
    setShowDeleteDialog(false);
    const idx = allImages.findIndex((img) => img.id === activeImage.id);
    const neighborId =
      idx > 0 ? allImages[idx - 1].id
      : idx < allImages.length - 1 ? allImages[idx + 1].id
      : null;
    if (neighborId !== null) setActiveId(neighborId);
    await onDelete(activeImage.id);
    if (neighborId === null) onClose();
  }, [activeImage, allImages, onDelete, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Arrow keys work in fullscreen too
      if (e.key === "ArrowLeft" && !showInfo) navigate(-1);
      if (e.key === "ArrowRight" && !showInfo) navigate(1);
      if (e.key === "Escape") {
        if (showDeleteDialog || showTagDialog) return;
        // Exit fullscreen first if active
        if (isFullscreen) {
          document.exitFullscreen();
          setIsFullscreen(false);
          return;
        }
        if (showInfo) { setShowInfo(false); setShowTagDialog(false); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, navigate, showInfo, showTagDialog, showDeleteDialog, isFullscreen, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload the prev/next full images so navigation feels instant
  useEffect(() => {
    if (!activeId || allImages.length < 2) return;
    const idx = allImages.findIndex((img) => img.id === activeId);
    [
      allImages[(idx + 1) % allImages.length],
      allImages[(idx - 1 + allImages.length) % allImages.length],
    ].forEach((img) => {
      const preload = new window.Image();
      preload.src = fullSrc(img.id);
      preload.onload = () =>
        setLoadedIds((prev) => (prev.has(img.id) ? prev : new Set([...prev, img.id])));
    });
  }, [activeId, allImages]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-none">
        <button onClick={onClose} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <p className="text-sm text-gray-300 truncate mx-3 flex-1 text-center">
          {activeImage.filename}
        </p>
        {/* Action icons — invisible (space reserved) when info panel is open */}
        <div className={`flex items-center gap-4 transition-opacity ${showInfo ? "invisible opacity-0" : ""}`}>
          <button
            onClick={() => onToggleFavourite(activeImage.id)}
            aria-label="Toggle favourite"
          >
            <Heart
              size={22}
              fill={activeImage.favourite ? "#ec4899" : "none"}
              color={activeImage.favourite ? "#ec4899" : "white"}
            />
          </button>
          <button onClick={() => setShowInfo(true)} aria-label="Info">
            <Info size={22} />
          </button>
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
          </button>
          <button onClick={() => setShowDeleteDialog(true)} aria-label="Delete">
            <Trash2 size={22} />
          </button>
        </div>
      </div>

      {/* Main content — flex-col on mobile, flex-row on sm+ when info open */}
      <div
        className={`flex-1 flex min-h-0 overflow-hidden ${
          showInfo ? "flex-col sm:flex-row" : "flex-col"
        }`}
      >
        {/* Image + carousel column */}
        <div
          className={`flex flex-col min-h-0 overflow-hidden ${
            showInfo ? "h-1/2 sm:h-auto sm:flex-1" : "flex-1"
          }`}
        >
          {/* Image area — clicking collapses info panel, double-tap enters fullscreen */}
          <div
            ref={imageAreaRef}
            className={`flex-1 min-h-0 flex items-center justify-center overflow-hidden relative ${
              showInfo ? "cursor-pointer" : ""
            }`}
            onClick={showInfo ? () => { setShowInfo(false); setShowTagDialog(false); } : handleImageClick}
            onDoubleClick={handleImageDoubleClick}
          >
            {/* Tap zones for prev/next — only when info is closed */}
            {!showInfo && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer"
                  onClick={() => navigate(-1)}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer"
                  onClick={() => navigate(1)}
                />
              </>
            )}

            {/* Blurred thumbnail shown while full image downloads */}
            <img
              key={`blur-${activeImage.id}`}
              src={thumbnailSrc(activeImage.id)}
              alt=""
              aria-hidden="true"
              className={`absolute max-w-full max-h-full object-contain blur-xl scale-110 transition-opacity duration-300 pointer-events-none ${
                loadedIds.has(activeImage.id) ? "opacity-0" : "opacity-70"
              }`}
            />

            {/* Full-resolution image — fades in once decoded */}
            <img
              key={activeImage.id}
              src={fullSrc(activeImage.id)}
              alt={activeImage.filename}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                loadedIds.has(activeImage.id) ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() =>
                setLoadedIds((prev) =>
                  prev.has(activeImage.id) ? prev : new Set([...prev, activeImage.id])
                )
              }
            />

            {/* Spinner while full image is in-flight */}
            {!loadedIds.has(activeImage.id) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </div>
            )}
          </div>

          {/* Thumbnail strip — hidden on mobile when info panel is open */}
          <div className={`flex-none pt-2 ${showInfo ? "hidden sm:block" : ""}`}>
            <ThumbnailCarousel
              images={allImages}
              activeId={activeImage.id}
              onSelect={(img) => setActiveId(img.id)}
            />
          </div>
        </div>

        {/* Info panel — inline, no portal. Also serves as the portal target for TagDialog on desktop. */}
        {showInfo && (
          <div
            ref={infoPanelRef}
            className="flex-1 sm:flex-none sm:w-80 overflow-y-auto bg-neutral-950 border-t border-neutral-800 sm:border-t-0 sm:border-l sm:border-neutral-800 relative"
          >
            <InfoPanel
              image={activeImage}
              onClose={() => { setShowInfo(false); setShowTagDialog(false); }}
              onOpenTagDialog={() => setShowTagDialog(true)}
            />
          </div>
        )}
      </div>

      <TagDialog
        image={activeImage}
        open={showTagDialog}
        onClose={() => setShowTagDialog(false)}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        suggestions={tagSuggestions}
        onLoadSuggestions={onLoadTagSuggestions}
        container={showInfo ? infoPanelRef.current : null}
      />

      <DeleteDialog
        open={showDeleteDialog}
        count={0}
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>,
    document.body,
  );
}
