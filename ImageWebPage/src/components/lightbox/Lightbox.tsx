"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Heart, Info, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { ImageDto } from "@/types";
import { fetchFullImageBlob, thumbnailSrc, isVideoFile } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ThumbnailCarousel from "./ThumbnailCarousel";
import InfoPanel from "./InfoPanel";
import DeleteDialog from "./DeleteDialog";
import LoginPromptDialog from "@/components/ui/LoginPromptDialog";
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
  const { isOwner } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loadedBlobUrls, setLoadedBlobUrls] = useState<Map<number, string>>(new Map());
  const [showInfo, setShowInfo] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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

  // Navigate function for arrow keys
  const navigate = useCallback(
    (delta: number) => {
      if (!activeId || allImages.length === 0) return;
      const idx = allImages.findIndex((img) => img.id === activeId);
      const nextIdx = (idx + delta + allImages.length) % allImages.length;
      setActiveId(allImages[nextIdx].id);
    },
    [activeId, allImages],
  );

  useEffect(() => {
    if (image) {
      setActiveId(image.id);
      setShowInfo(false);
      setShowTagDialog(false);
      setShowDeleteDialog(false);
      setShowLoginPrompt(false);
      if (isFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
      // Fetch the full image blob for the active image if not already loaded
      if (!loadedBlobUrls.has(image.id)) {
        fetchFullImageBlob(image.id)
          .then((blobUrl) => {
            setLoadedBlobUrls((prev) => {
              if (prev.has(image.id)) {
                URL.revokeObjectURL(blobUrl);
                return prev;
              }
              const next = new Map(prev);
              next.set(image.id, blobUrl);
              return next;
            });
          })
          .catch((err) => console.error(`Failed to load image ${image.id}:`, err));
      }
    }
  }, [image?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteClick = useCallback(() => {
    if (!isOwner) {
      setShowLoginPrompt(true);
    } else {
      setShowDeleteDialog(true);
    }
  }, [isOwner]);

  // Listen for fullscreen changes (e.g., ESC key pressed)
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Validate that activeId still exists in allImages. If the array changes order/content,
  // reset to the image prop to prevent carousel-image mismatch
  const activeImage = allImages.find((img) => img.id === activeId) ?? null;
  const isOpen = image !== null && activeImage !== null;

  // Watch for changes to allImages and ensure activeId is still valid
  useEffect(() => {
    if (!isOpen || !activeId) return;
    // If activeId no longer exists in the new allImages array, sync back to the image prop
    if (!allImages.some((img) => img.id === activeId) && image) {
      setActiveId(image.id);
    }
  }, [allImages, isOpen, activeId, image]);

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

  // Cleanup blob URLs on unmount or when lightbox closes
  useEffect(() => {
    if (!isOpen) {
      // Revoke all blob URLs when lightbox closes
      loadedBlobUrls.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
      setLoadedBlobUrls(new Map());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Arrow keys always work, even when info panel is open
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
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
  }, [isOpen, navigate, showTagDialog, showDeleteDialog, isFullscreen, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload the prev/next full images so navigation feels instant
  useEffect(() => {
    if (!activeId || allImages.length < 2) return;
    const idx = allImages.findIndex((img) => img.id === activeId);
    const toPreload = [
      allImages[(idx + 1) % allImages.length],
      allImages[(idx - 1 + allImages.length) % allImages.length],
    ];

    toPreload.forEach((img) => {
      // Check current loaded state before fetching
      setLoadedBlobUrls((currentLoaded) => {
        if (currentLoaded.has(img.id)) {
          // Already loaded, no need to fetch again
          return currentLoaded;
        }

        // Not loaded yet, fetch it
        fetchFullImageBlob(img.id)
          .then((blobUrl) => {
            setLoadedBlobUrls((prev) => {
              const updated = new Map(prev);
              updated.set(img.id, blobUrl);
              return updated;
            });
          })
          .catch((err) => console.error(`Failed to preload image ${img.id}:`, err));

        // Return current state unchanged; fetch happens asynchronously
        return currentLoaded;
      });
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
          <button onClick={handleDeleteClick} aria-label="Delete">
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
          {/* Image area — double-click toggles fullscreen */}
          <div
            ref={imageAreaRef}
            className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative"
            onDoubleClick={handleImageDoubleClick}
          >
            {/* Blurred thumbnail shown while full image downloads */}
            <img
              key={`blur-${activeImage.id}`}
              src={thumbnailSrc(activeImage.id)}
              alt=""
              aria-hidden="true"
              className={`absolute max-w-full max-h-full object-contain blur-xl scale-110 transition-opacity duration-300 pointer-events-none ${
                loadedBlobUrls.has(activeImage.id) ? "opacity-0" : "opacity-70"
              }`}
            />

            {/* Full-resolution image or video — fades in once decoded */}
            {loadedBlobUrls.has(activeImage.id) && (
              isVideoFile(activeImage.filename) ? (
                <video
                  key={activeImage.id}
                  src={loadedBlobUrls.get(activeImage.id)}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain transition-opacity duration-300 opacity-100"
                />
              ) : (
                <img
                  key={activeImage.id}
                  src={loadedBlobUrls.get(activeImage.id)}
                  alt={activeImage.filename}
                  className="max-w-full max-h-full object-contain transition-opacity duration-300 opacity-100"
                />
              )
            )}

            {/* Spinner while full image is in-flight */}
            {!loadedBlobUrls.has(activeImage.id) && (
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

      <LoginPromptDialog
        open={showLoginPrompt}
        action="delete this image"
        onClose={() => setShowLoginPrompt(false)}
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
