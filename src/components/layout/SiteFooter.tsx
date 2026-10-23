import Link from "next/link";
import { publicEnv } from "@/public-env";
import { ar, t } from "@/i18n/ar";
import { Logo } from "./Logo";

const linkClass = "text-white/75 transition-colors hover:text-mint";

export function SiteFooter() {
  const whatsapp = `https://wa.me/${publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER}`;
  return (
    <footer id="contact" className="bg-band mt-auto text-white">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="flex flex-col gap-4 md:col-span-2">
          <Logo size={64} />
          <p className="max-w-md text-sm leading-7 text-white/75">{ar.footer.about}</p>
        </div>
        <nav aria-label={ar.footer.quickLinks} className="flex flex-col gap-3 text-sm">
          <h2 className="text-mint text-base font-extrabold">{ar.footer.quickLinks}</h2>
          <Link className={linkClass} href="/">
            {ar.nav.home}
          </Link>
          <Link className={linkClass} href="/#products">
            {ar.nav.products}
          </Link>
          <Link className={linkClass} href="/gallery">
            {ar.nav.gallery}
          </Link>
          <Link className={linkClass} href="/track">
            {ar.nav.track}
          </Link>
          <Link className={linkClass} href="/login">
            {ar.nav.staffLogin}
          </Link>
        </nav>
        <div className="flex flex-col gap-3 text-sm">
          <h2 className="text-mint text-base font-extrabold">{ar.footer.contact}</h2>
          <a className={linkClass} href={whatsapp} rel="noopener noreferrer" target="_blank">
            {ar.footer.whatsapp}: <bdi dir="ltr">01116891025</bdi>
          </a>
          <span className="text-white/75">{ar.footer.email}</span>
          <span className="text-white/75">{ar.footer.location}</span>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">
        {t(ar.footer.rights, { year: 2026 })}
      </div>
    </footer>
  );
}
