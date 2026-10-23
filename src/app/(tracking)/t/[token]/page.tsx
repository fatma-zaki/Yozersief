import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Feedback";

/**
 * WhatsApp tracking link (B6, A6.7). Phase 2 resolves the hashed token to an order and
 * pre-fills the ref; until then every link falls back to manual entry with a warning.
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
