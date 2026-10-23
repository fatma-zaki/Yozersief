import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/Providers.client";
import { ar } from "@/i18n/ar";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu.client";

export const MARKETING_LINKS = [
  { href: "/", label: ar.nav.home },
  { href: "/#products", label: ar.nav.products },
  { href: "/gallery", label: ar.nav.gallery },
  { href: "/#about", label: ar.nav.about },
  { href: "/#contact", label: ar.nav.contact },
] as const;

/** Floating glass navbar over the dark hero band (design: Main.html). */
export function MarketingNav() {
  return (
    <header className="sticky top-3.5 z-40 h-0 px-4 sm:px-5">
      <div className="glass-dark mx-auto flex max-w-[1320px] items-center gap-6 rounded-[26px] py-2 ps-5 pe-3 text-white">
        <Logo size={56} />
        <nav
          aria-label={ar.nav.mainMenu}
          className="hidden flex-1 justify-center gap-7 text-[15px] leading-6 font-bold lg:flex"
        >
          {MARKETING_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-mint border-b-2 border-transparent py-2 text-white/85 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1 lg:hidden" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/order">{ar.nav.startOrderNow}</Link>
          </Button>
          <MobileMenu links={MARKETING_LINKS} />
        </div>
      </div>
    </header>
  );
}
