import Link from "next/link";
import { Search, Calendar, Heart, Upload, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">Gallery</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white px-4 py-2 font-semibold text-black transition hover:bg-gray-100"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
          Your photos and videos,
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            beautifully organized
          </span>
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-xl text-gray-400">
          Upload, organize, and search your media with intelligent tagging,
          smart grouping, and instant visual search powered by AI.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-100"
          >
            Get started
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-600 px-8 py-4 font-semibold transition hover:border-gray-400 hover:bg-white/5"
          >
            Sign in to existing account
          </Link>
        </div>

        {/* Hero Visual Mockup */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <div className="p-4 md:p-8">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-lg border border-neutral-700 bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                >
                  <div className="text-sm font-medium text-neutral-600">
                    Photo {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h3 className="mb-12 text-center text-3xl font-bold">
          Powerful features
        </h3>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Feature 1: Smart Search */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <Search className="text-blue-400" size={24} />
            </div>
            <h4 className="mb-3 text-xl font-semibold">
              Visual & Natural Language Search
            </h4>
            <p className="text-gray-400">
              Search by description ("sunset over ocean"), visual similarity, or
              uploaded images. Powered by AI-generated descriptions of every
              upload.
            </p>
          </div>

          {/* Feature 2: Auto-Organize */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Calendar className="text-cyan-400" size={24} />
            </div>
            <h4 className="mb-3 text-xl font-semibold">
              Auto-Organized by Date
            </h4>
            <p className="text-gray-400">
              Your media is automatically grouped by date, making it easy to
              revisit memories and find photos from specific moments.
            </p>
          </div>

          {/* Feature 3: Favorites & Tags */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/20">
              <Heart className="text-rose-400" size={24} />
            </div>
            <h4 className="mb-3 text-xl font-semibold">
              Favorites & Custom Tags
            </h4>
            <p className="text-gray-400">
              Mark your favorite photos and create custom tags to organize your
              collection exactly how you want it.
            </p>
          </div>

          {/* Feature 4: Fast Upload */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
              <Upload className="text-amber-400" size={24} />
            </div>
            <h4 className="mb-3 text-xl font-semibold">Drag & Drop Upload</h4>
            <p className="text-gray-400">
              Upload multiple photos and videos at once with a simple
              drag-and-drop interface. Thumbnails generated instantly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h3 className="mb-12 text-center text-3xl font-bold">How it works</h3>
        <div className="grid gap-8 md:grid-cols-3 md:gap-12">
          {/* Step 1 */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-500/50 bg-blue-500/20">
              <span className="text-2xl font-bold text-blue-400">1</span>
            </div>
            <h4 className="mb-3 text-xl font-semibold">Upload</h4>
            <p className="text-gray-400">
              Drag and drop your photos and videos, or upload them one by one.
              No limits on file types or resolution.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-500/50 bg-cyan-500/20">
              <span className="text-2xl font-bold text-cyan-400">2</span>
            </div>
            <h4 className="mb-3 text-xl font-semibold">
              Auto-Organize & Describe
            </h4>
            <p className="text-gray-400">
              Media is automatically organized by date and AI-generated
              descriptions make your content searchable instantly.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500/50 bg-rose-500/20">
              <span className="text-2xl font-bold text-rose-400">3</span>
            </div>
            <h4 className="mb-3 text-xl font-semibold">Search & Relive</h4>
            <p className="text-gray-400">
              Search by description, visual similarity, date, or tags.
              Rediscover your best moments in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-y border-neutral-800 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h3 className="mb-6 text-3xl font-bold">Ready to get started?</h3>
          <p className="mx-auto mb-8 max-w-2xl text-gray-400">
            Start organizing your photos and videos today. Free to use, no
            credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-100"
          >
            Get started
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Gallery. All rights reserved.
          </p>
          <Link
            href="/login"
            className="text-sm text-gray-500 transition hover:text-gray-300"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
