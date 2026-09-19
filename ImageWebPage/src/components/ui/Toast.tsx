"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Toast provider. Wraps the app to enable showToast() from any component.
 * Renders a single auto-dismissing toast notification at the bottom-center of the screen.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    // Clear any pending dismiss timer
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    // Show the new message
    setMessage(msg);
    // Auto-dismiss after 2.5 seconds
    dismissTimerRef.current = setTimeout(() => {
      setMessage(null);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 transform">
            <div className="whitespace-nowrap rounded-xl bg-surface-3 px-4 py-2.5 text-sm shadow-lg">
              {message}
            </div>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/**
 * Hook to show a toast notification from any component.
 * Must be used inside a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
