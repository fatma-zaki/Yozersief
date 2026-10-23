"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/Dialog.client";
import { ar } from "@/i18n/ar";

export function MobileMenu({ links }: { links: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={ar.nav.menu}
        className="rounded-input flex size-11 items-center justify-center hover:bg-white/10 lg:hidden"
      >
        <Menu className="size-6" />
      </DialogTrigger>
      <SheetContent title={ar.nav.menu}>
        <nav aria-label={ar.nav.mainMenu} className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-input hover:bg-off-bg flex min-h-12 items-center px-4 text-base font-bold"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/track"
            onClick={() => setOpen(false)}
            className="rounded-input hover:bg-off-bg flex min-h-12 items-center px-4 text-base font-bold"
          >
            {ar.nav.track}
          </Link>
          <Button asChild className="mt-3">
            <Link href="/order" onClick={() => setOpen(false)}>
              {ar.nav.startOrderNow}
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Dialog>
  );
}
