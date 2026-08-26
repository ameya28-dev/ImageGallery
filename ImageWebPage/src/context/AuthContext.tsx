"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { setApiToken, ApiError } from "@/lib/api";

interface User {
  email: string;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isOwner: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  /** Called by the OAuth callback page to inject a token received via redirect. */
  handleOAuthCallback: (token: string, email: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Attempts a silent refresh using the httpOnly refresh cookie. */
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data: { accessToken: string; email: string } = await res.json();
        setAccessToken(data.accessToken);
        setApiToken(data.accessToken);
        setUser({ email: data.email });
        scheduleRefresh();
        return true;
      }
    } catch { /* network error → stay as guest */ }
    return false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Schedules an auto-refresh 5 minutes before the 1-hour token expires. */
  const scheduleRefresh = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => refresh(), 55 * 60 * 1000);
  };

  // On mount: attempt silent refresh
  useEffect(() => {
    refresh().finally(() => setLoading(false));
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Throw ApiError with proper errorType and message for frontend handling
      throw new ApiError(
        res.status,
        err.message ?? err.error ?? "Sign-in failed",
        err.errorType,
        err
      );
    }
    const data: { accessToken: string; email: string } = await res.json();
    setAccessToken(data.accessToken);
    setApiToken(data.accessToken);
    setUser({ email: data.email });
    scheduleRefresh();
  };

  const loginWithGoogle = () => {
    window.location.href = `${BASE}/oauth2/authorization/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch { /* ignore network errors on logout */ }
    setAccessToken(null);
    setApiToken(null);
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };

  /** Invoked by the /auth/callback page after a Google OAuth redirect. */
  const handleOAuthCallback = (token: string, email: string) => {
    setAccessToken(token);
    setApiToken(token);
    setUser({ email });
    scheduleRefresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isOwner: user !== null,
        loading,
        login,
        loginWithGoogle,
        logout,
        handleOAuthCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
