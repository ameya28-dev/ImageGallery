"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * When provided, the sheet is portaled INTO this element instead of document.body,
   * and uses absolute positioning so it is visually constrained to the container.
   * The container must have `position: relative` and `overflow: hidden`.
   */
  container?: Element | null;
}

/**
 * Portal-based bottom sheet.
 * - Default (no container): renders at z-[60] over the entire viewport.
 * - With container: overlays only the container element (used for the desktop info sidebar).
 */
export default function BottomSheet({ open, onClose, children, container }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    if (!container) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      if (!container) document.body.style.overflow = "";
    };
  }, [open, onClose, container]);

  if (!open || typeof window === "undefined") return null;

  const portalTarget = container ?? document.body;
  const posClass = container ? "absolute" : "fixed";

  return createPortal(
    <div className={`${posClass} inset-0 z-[60] flex items-end`}>
      <div className={`${posClass} inset-0 bg-black/60`} onClick={onClose} />
      <div className="relative w-full bg-surface-2 rounded-t-3xl max-h-[85%] overflow-y-auto">
        {children}
      </div>
    </div>,
    portalTarget,
  );
}
