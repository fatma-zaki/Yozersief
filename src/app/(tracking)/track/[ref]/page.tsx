import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Feedback";

/**
 * Tracking view for one verified order (B6). Phase 2 checks the signed per-order cookie and
 * shows status, stage rail, action-needed card and customer-visible timeline only.
 */
export default function TrackOrderPage({ params }: PageProps<"/track/[ref]">) {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-64" />}>
      <TrackOrder params={params} />
    </Suspense>
  );
}

async function TrackOrder({ params }: Pick<PageProps<"/track/[ref]">, "params">): Promise<never> {
  await params;
  redirect("/track");
}
