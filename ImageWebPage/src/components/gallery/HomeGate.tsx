"use client";

import { useAuth } from "@/context/AuthContext";
import GalleryPage from "@/components/gallery/GalleryPage";
import LandingPage from "@/components/landing/LandingPage";

const guestModeEnabled = process.env.NEXT_PUBLIC_GUEST_MODE === "true";

/**
 * HomeGate: Route-level branching at `/` based on profile and auth state.
 *
 * - If guest mode is enabled (local profile): always render gallery (guest or owner view)
 * - If guest mode is disabled (feature profile):
 *   - While loading: show a minimal loading screen (avoid landing-page flash for real owners)
 *   - If authenticated (isOwner): render gallery
 *   - If not authenticated: render marketing landing page
 */
export default function HomeGate() {
  const { isOwner, loading } = useAuth();

  // Local profile: guest mode enabled — always show the gallery
  if (guestModeEnabled) {
    return <GalleryPage />;
  }

  // Feature profile: avoid rendering landing page while auth is still loading
  // This prevents a brief flash of the landing page for a real owner on page refresh
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <div className="h-4 w-4 animate-pulse rounded-full bg-gray-600" />
            <span>Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  // Feature profile: post-load decision based on auth state
  return isOwner ? <GalleryPage /> : <LandingPage />;
}
