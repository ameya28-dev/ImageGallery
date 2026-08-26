"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      // Check if it's a user-not-found error
      if (err instanceof ApiError && err.errorType === "USER_NOT_FOUND") {
        setError(err.message);
        setShowCreateModal(true);
      } else {
        setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    // Navigate to register page with email pre-filled via query param
    router.push(`/register?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Gallery</h1>
          <p className="text-gray-400 text-sm mt-2">Sign in to manage your gallery</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full bg-neutral-900 text-white rounded-2xl px-4 py-3.5 outline-none placeholder-gray-500 text-sm focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full bg-neutral-900 text-white rounded-2xl px-4 py-3.5 pr-12 outline-none placeholder-gray-500 text-sm focus:ring-1 focus:ring-white/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold rounded-2xl py-3.5 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Signing in…</span>
            ) : (
              <>
                <LogIn size={16} />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Divider + Google button (feature profile only) */}
        {googleAuthEnabled && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-gray-500 text-xs">or</span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-700 rounded-2xl py-3.5 text-sm text-white hover:border-gray-500 hover:bg-white/5 transition-colors"
            >
              {/* Google "G" logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </>
        )}

        {/* Guest hint and register link */}
        <p className="text-center text-gray-600 text-xs mt-8">
          Browsing as guest · 5 uploads/day
        </p>
        <p className="text-center text-gray-400 text-sm mt-4">
          New here?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Create account
          </Link>
        </p>
      </div>

      {/* Account Not Found Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-neutral-800">
            <h2 className="text-xl font-bold text-white mb-2">Account doesn't exist</h2>
            <p className="text-gray-400 text-sm mb-6">
              No account found for <span className="text-white font-medium">{email}</span>. Would you like to create one?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
