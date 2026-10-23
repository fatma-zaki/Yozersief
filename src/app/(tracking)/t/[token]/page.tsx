import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Feedback";

/**
 * WhatsApp tracking link entry (B6, A6.7).
 *
 * Token-based pre-fill is not implemented in the no-OTP scope (ADR-0007): resolving a
 * public token without the intended hashed lookup + phone confirmation would be unsafe.
 * Every link falls back to manual entry with a warning — we do not treat the path token
 * as authorization or expose an order from it.
 */
export default function TrackingLinkPage({ params }: PageProps<"/t/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-64" />}>
      <ResolveLink params={params} />
    </Suspense>
  );
}

async function ResolveLink({ params }: Pick<PageProps<"/t/[token]">, "params">): Promise<never> {
  await params;
  redirect("/track?link=invalid");
}
