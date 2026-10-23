import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Stepper";
import { ar } from "@/i18n/ar";
import { formatDate, formatDateTime } from "@/lib/format";
import { publicEnv } from "@/public-env";
import type { CustomerTrackingDto } from "@/modules/tracking";
import { TrackingLogoutButton } from "./TrackingLogout.client";

export { TrackingSessionMessage } from "./TrackingSessionMessage";

/** Server-rendered customer tracking result (session already validated). */
export function TrackingView({ order }: { order: CustomerTrackingDto }) {
  const steps = order.railLabels.map((label, i) => ({
    key: `${order.path}-${i}`,
    label,
  }));
  const needsAttention = order.status === "awaiting_customer" || order.status === "rejected";

  return (
    <div className="flex flex-col gap-5">
      <Card tone="dark" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/80">
            طلب رقم{" "}
            <strong dir="ltr" className="text-mint tracking-wide">
              {order.ref}
            </strong>
          </p>
          <TrackingLogoutButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-white/70">
              {ar.tracking.currentStatus} · {formatDateTime(new Date(order.createdAt))}
            </span>
            <h2 className="text-2xl leading-9 font-extrabold text-white">{order.statusLabel}</h2>
            <p className="text-sm leading-6 text-white/85">{order.statusDescription}</p>
          </div>
        </div>
        {order.rejectionReason ? (
          <div
            role="status"
            className="rounded-input border-gold/50 bg-warn-bg/20 text-warn-ink border px-4 py-3 text-sm"
          >
            <p className="font-bold">{ar.tracking.rejectionTitle}</p>
            <p className="mt-1 leading-6">{order.rejectionReason}</p>
          </div>
        ) : null}
        <Stepper
          steps={steps}
          current={order.railIndex}
          tone="dark"
          label={ar.tracking.stageRail}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{ar.tracking.timeline}</CardTitle>
          <Badge tone={needsAttention ? "warn" : "ok"}>{ar.tracking.timelineNewest}</Badge>
        </div>
        {order.events.length === 0 ? (
          <p className="text-ink-muted text-sm">{ar.tracking.emptyTimeline}</p>
        ) : (
          <ol className="flex flex-col gap-0">
            {order.events.map((event, i) => (
              <li key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center" aria-hidden>
                  <span
                    className={
                      i === 0
                        ? "bg-mint mt-1 size-4 shrink-0 rounded-full shadow-[0_0_0_4px_rgb(126_232_199/0.28)]"
                        : "border-accent/40 mt-1 size-4 shrink-0 rounded-full border-2 bg-white"
                    }
                  />
                  {i < order.events.length - 1 ? (
                    <span className="bg-line my-1 w-0.5 flex-1" />
                  ) : null}
                </div>
                <div className="flex flex-col pb-5">
                  <time className="text-ink-muted text-xs font-semibold">
                    {formatDateTime(new Date(event.createdAt))}
                  </time>
                  <strong className="text-[15px] leading-6">{event.titleAr}</strong>
                  {event.note ? (
                    <span className="text-ink-muted text-sm leading-6">{event.note}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>{ar.tracking.orderDetails}</CardTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm leading-6">
          <dt className="font-bold">الاستلام</dt>
          <dd className="text-ink-muted m-0">
            {order.receiptMethod === "pickup"
              ? ar.tracking.receiptPickup
              : ar.tracking.receiptDelivery}
          </dd>
          <dt className="font-bold">{ar.tracking.desiredDate}</dt>
          <dd className="text-ink-muted m-0">
            {order.desiredDate
              ? formatDate(new Date(`${order.desiredDate}T12:00:00Z`))
              : ar.tracking.desiredDateUnset}
          </dd>
        </dl>
      </Card>

      <Card tone="dark" className="flex flex-col items-start gap-3">
        <h2 className="text-xl font-extrabold text-white">{ar.tracking.helpTitle}</h2>
        <p className="text-sm text-white/80">{ar.tracking.helpBody}</p>
        <Button asChild size="lg">
          <Link
            href={`https://wa.me/${publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ar.tracking.helpWhatsApp}
          </Link>
        </Button>
      </Card>
    </div>
  );
}
