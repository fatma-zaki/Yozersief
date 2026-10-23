import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/ui/Providers.client";
import { publicEnv } from "@/public-env";
import { ar } from "@/i18n/ar";

/** Tracking layout (brief A7, B6): mobile-first, most visitors arrive from a WhatsApp link. */
export default function TrackingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="bg-band text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Logo size={48} />
          <span className="text-base font-extrabold">{ar.tracking.title}</span>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="text-ink-muted mx-auto w-full max-w-xl px-4 pb-8 text-center text-sm">
        محتاج مساعدة؟{" "}
        <Link
          className="text-accent font-bold underline"
          href={`https://wa.me/${publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          كلّمنا على واتساب
        </Link>
      </footer>
    </>
  );
}
