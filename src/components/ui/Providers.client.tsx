"use client";

import { Moon, Sun } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/cn";

/**
 * The anti-flash script only matters in the server HTML. On the client React 19 warns about any
 * executable <script> it renders, so mark it as an inert data block there (next-themes already
 * sets suppressHydrationWarning on it, so the `type` mismatch is silent).
 */
const themeScriptProps = {
  type: typeof window === "undefined" ? "text/javascript" : "text/plain",
};

/** Light/dark theme following the system by default (brief A7). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={themeScriptProps}
    >
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

/**
 * The dashboard opens in light until the member picks a theme with the toggle. The script runs
 * before paint (no dark flash on a dark system); the effect covers a provider that hydrated first.
 * The choice is stored like any other toggle, so it then applies site-wide on this browser.
 */
export function DefaultLightTheme() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme === "system") setTheme("light");
  }, [theme, setTheme]);
  return (
    <script
      {...themeScriptProps}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `try{if(!localStorage.getItem("theme")){localStorage.setItem("theme","light");var d=document.documentElement;d.classList.remove("dark");d.classList.add("light");d.style.colorScheme="light"}}catch(e){}`,
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
