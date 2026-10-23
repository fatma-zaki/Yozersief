import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";

export const metadata = { title: ar.order.confirmationTitle };

/** Confirmation (B5). Phase 1 shows the ref and person/organisation next steps. */
export default function ConfirmationPage() {
  return (
    <EmptyState
      icon={<PartyPopper />}
      title={ar.order.confirmationTitle}
      description={ar.order.comingSoon}
      action={
        <Button asChild>
          <Link href="/track">{ar.nav.track}</Link>
        </Button>
      }
    />
  );
}
