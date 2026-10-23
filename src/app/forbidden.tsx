import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";
import { RequestAccessButton } from "./RequestAccessButton.client";

/** "This page is not in your role's permissions" + request access (brief A6.3, B10). */
export default function Forbidden() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-24">
      <EmptyState
        className="w-full"
        icon={<ShieldOff />}
        title={ar.forbidden.title}
        description={ar.forbidden.body}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <RequestAccessButton />
            <Button asChild variant="line">
              <Link href="/dashboard">{ar.forbidden.backToDashboard}</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
