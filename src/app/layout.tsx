import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Providers } from "@/components/ui/Providers.client";
import { ar } from "@/i18n/ar";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: `${ar.app.name} | ${ar.app.tagline}`, template: `%s | ${ar.app.name}` },
  description: ar.home.subtitle,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#001412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class before React hydrates.
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="rounded-pill bg-surface sr-only z-[100] px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:right-3"
        >
          {ar.nav.skipToContent}
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
