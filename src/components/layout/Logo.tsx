import Image from "next/image";
import Link from "next/link";
import { ar } from "@/i18n/ar";
import { cn } from "@/lib/cn";

export function Logo({
  size = 56,
  className,
  href = "/",
}: {
  size?: number;
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${ar.app.name} — ${ar.nav.home}`}
      className={cn("block shrink-0", className)}
    >
      <Image
        src="/brand/logo.jpg"
        alt={`شعار ${ar.app.name}`}
        width={size}
        height={size}
        priority
        className="rounded-[16px]"
      />
    </Link>
  );
}
