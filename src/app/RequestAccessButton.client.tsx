"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ar } from "@/i18n/ar";
import { sectionForPath } from "@/lib/rbac/routes";
import { requestAccessAction } from "./(dashboard)/dashboard/actions";

/** Works out which permission the blocked page needs from the shared route map. */
export function RequestAccessButton() {
  const permission = sectionForPath(usePathname())?.permission ?? null;
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!permission) return null;

  return (
    <Button
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          const result = await requestAccessAction(permission);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setDone(true);
          toast.success(ar.forbidden.requested);
        })
      }
    >
      {done ? ar.forbidden.requested : ar.forbidden.requestAccess}
    </Button>
  );
}
