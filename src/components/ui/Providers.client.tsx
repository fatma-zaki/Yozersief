"use client";

import { Moon, Sun } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/cn";

/** Light/dark theme following the system by default (brief A7). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

/** Toasts: top-center, RTL, glass. Call `toast()` from "sonner" anywhere on the client. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      dir="rtl"
      position="top-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "glass !rounded-card-sm !font-sans !text-ink",
          description: "!text-ink-muted",
        },
      }}
    />
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="تبديل الوضع الفاتح والداكن"
      className={cn(
        "rounded-input flex size-11 items-center justify-center text-current hover:bg-white/10",
        className,
      )}
    >
      {/* Both icons render; CSS shows the right one so SSR and client agree. */}
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="block size-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
