import Link from "next/link";
import { Search, Calendar, Heart, Upload, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-neutral-800 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gallery</h1>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-400 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
          Your photos and videos,
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            beautifully organized
          </span>
        </h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Upload, organize, and search your media with intelligent tagging, smart grouping, and instant visual search powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            Get started
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border border-gray-600 rounded-lg font-semibold hover:border-gray-400 hover:bg-white/5 transition"
          >
            Sign in to existing account
          </Link>
        </div>

        {/* Hero Visual Mockup */}
        <div className="mt-16 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
          <div className="p-4 md:p-8">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-neutral-700 flex items-center justify-center"
                >
                  <div className="text-neutral-600 text-sm font-medium">
                    Photo {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Powerful features</h3>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Feature 1: Smart Search */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Search className="text-blue-400" size={24} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Visual & Natural Language Search</h4>
            <p className="text-gray-400">
              Search by description ("sunset over ocean"), visual similarity, or uploaded images. Powered by AI-generated descriptions of every upload.
            </p>
          </div>

          {/* Feature 2: Auto-Organize */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="bg-cyan-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="text-cyan-400" size={24} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Auto-Organized by Date</h4>
            <p className="text-gray-400">
              Your media is automatically grouped by date, making it easy to revisit memories and find photos from specific moments.
            </p>
          </div>

          {/* Feature 3: Favorites & Tags */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="bg-rose-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Heart className="text-rose-400" size={24} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Favorites & Custom Tags</h4>
            <p className="text-gray-400">
              Mark your favorite photos and create custom tags to organize your collection exactly how you want it.
            </p>
          </div>

          {/* Feature 4: Fast Upload */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="bg-amber-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Upload className="text-amber-400" size={24} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Drag & Drop Upload</h4>
            <p className="text-gray-400">
              Upload multiple photos and videos at once with a simple drag-and-drop interface. Thumbnails generated instantly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">How it works</h3>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6 border-2 border-blue-500/50">
              <span className="text-2xl font-bold text-blue-400">1</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Upload</h4>
            <p className="text-gray-400">
              Drag and drop your photos and videos, or upload them one by one. No limits on file types or resolution.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-6 border-2 border-cyan-500/50">
              <span className="text-2xl font-bold text-cyan-400">2</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Auto-Organize & Describe</h4>
            <p className="text-gray-400">
              Media is automatically organized by date and AI-generated descriptions make your content searchable instantly.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6 border-2 border-rose-500/50">
              <span className="text-2xl font-bold text-rose-400">3</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Search & Relive</h4>
            <p className="text-gray-400">
              Search by description, visual similarity, date, or tags. Rediscover your best moments in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-y border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to get started?</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Start organizing your photos and videos today. Free to use, no credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex px-8 py-4 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition gap-2 items-center"
          >
            Get started
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Gallery. All rights reserved.</p>
          <Link href="/login" className="text-gray-500 hover:text-gray-300 text-sm transition">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
