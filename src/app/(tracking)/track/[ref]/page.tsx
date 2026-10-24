import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";
import { normalizeOrderRef } from "@/lib/ids";
import {
  getCustomerTrackingView,
  readTrackingSession,
  trackingSessionGateMessage,
  type TrackingSessionGateMessage,
} from "@/modules/tracking";
import { ClearTrackingSessionOnMount } from "../../ClearTrackingSession.client";
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

function GateMessage({ msg }: { msg: TrackingSessionGateMessage }) {
  return (
    <>
      {msg.clearCookie ? <ClearTrackingSessionOnMount /> : null}
      <TrackingSessionMessage title={msg.title} body={msg.body} />
    </>
  );
}

async function TrackOrder({ params }: Pick<PageProps<"/track/[ref]">, "params">) {
  const { ref: rawRef } = await params;
  const ref = normalizeOrderRef(rawRef);

  const session = await readTrackingSession();
  if (session.status === "absent") {
    return <GateMessage msg={trackingSessionGateMessage("absent")} />;
  }
  if (session.status === "invalid") {
    return <GateMessage msg={trackingSessionGateMessage("invalid")} />;
  }

  if (!ref) {
    return <GateMessage msg={trackingSessionGateMessage("ref_invalid")} />;
  }

  const result = await getCustomerTrackingView(session.orderId, ref);
  if (!result.ok) {
    if (result.error.code === "unauthorized") {
      return <GateMessage msg={trackingSessionGateMessage("mismatch")} />;
    }
    if (result.error.code === "not_found") {
      return (
        <GateMessage msg={trackingSessionGateMessage("order_missing", result.error.userMessage)} />
      );
    }
    return (
      <GateMessage msg={trackingSessionGateMessage("load_failed", result.error.userMessage)} />
    );
  }

  return <TrackingView order={result.value} />;
}
