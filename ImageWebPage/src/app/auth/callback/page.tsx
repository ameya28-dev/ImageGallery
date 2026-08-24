"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    if (token && email) {
      handleOAuthCallback(decodeURIComponent(token), decodeURIComponent(email));
    }
    router.replace("/");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-gray-400 text-sm">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
