"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ar } from "@/i18n/ar";
import { logoutTrackingAction } from "./actions";

export function TrackingLogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-white hover:bg-white/10"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (pending) return;
        startTransition(async () => {
          await logoutTrackingAction();
          router.push("/track");
          router.refresh();
        });
      }}
    >
      <LogOut aria-hidden className="size-4" />
      {pending ? ar.tracking.loggingOut : ar.tracking.logout}
    </Button>
  );
}
