import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";
import { TrackForm } from "../TrackForm.client";

export const metadata = { title: ar.tracking.title };

/**
 * Manual entry: order ref + registered phone → signed tracking session (ADR-0007).
 * Form sits in Suspense (searchParams); result pages read the tracking cookie inside Suspense
 * so personalized HTML is not shared across customers (ADR-0006).
 */
export default function TrackPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-64" />}>
      <TrackForm />
    </Suspense>
  );
}
