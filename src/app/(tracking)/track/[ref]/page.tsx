import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";
import { normalizeOrderRef } from "@/lib/ids";
import { getCustomerTrackingView, readTrackingSessionOrderId } from "@/modules/tracking";
import { TrackingSessionMessage } from "../../TrackingSessionMessage";
import { TrackingView } from "../../TrackingView";

export const metadata = { title: ar.tracking.title };

/**
 * Tracking view for one verified order (B6, ADR-0007).
 * Authorization comes only from the signed httpOnly cookie, not from the URL ref alone.
 * Cookie read runs inside Suspense so Cache Components do not share personalized HTML.
 */
export default function TrackOrderPage({ params }: PageProps<"/track/[ref]">) {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-64" />}>
      <TrackOrder params={params} />
    </Suspense>
  );
}

async function TrackOrder({ params }: Pick<PageProps<"/track/[ref]">, "params">) {
  const { ref: rawRef } = await params;
  const ref = normalizeOrderRef(rawRef);

  const sessionOrderId = await readTrackingSessionOrderId();
  if (!sessionOrderId) {
    return (
      <TrackingSessionMessage title={ar.tracking.sessionExpired} body={ar.tracking.unauthorized} />
    );
  }

  if (!ref) {
    return <TrackingSessionMessage title={ar.tracking.loadError} body={ar.tracking.refInvalid} />;
  }

  const result = await getCustomerTrackingView(sessionOrderId, ref);
  if (!result.ok) {
    const expiredish = result.error.code === "unauthorized" || result.error.code === "not_found";
    return (
      <TrackingSessionMessage
        title={expiredish ? ar.tracking.sessionExpired : ar.tracking.loadError}
        body={result.error.userMessage}
      />
    );
  }

  return <TrackingView order={result.value} />;
}
