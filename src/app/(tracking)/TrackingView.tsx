import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Stepper";
import { ar } from "@/i18n/ar";
import { formatDateTime } from "@/lib/format";
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

  return (
    <div className="flex flex-col gap-5">
      <Card tone="dark" className="flex flex-col gap-4 bg-(--yz-band)!">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/90">
            طلب رقم{" "}
            <strong dir="ltr" className="text-mint tracking-wide">
              {order.ref}
            </strong>
          </p>
          <TrackingLogoutButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-white/85">
              {ar.tracking.currentStatus} · {formatDateTime(new Date(order.createdAt))}
            </span>
            <h2 className="text-2xl leading-9 font-extrabold text-white">{order.statusLabel}</h2>
            <p className="text-sm leading-6 text-white/90">{order.statusDescription}</p>
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

      <Card tone="dark" className="flex flex-col items-start gap-3 bg-(--yz-band)!">
        <h2 className="text-xl font-extrabold text-white">{ar.tracking.helpTitle}</h2>
        <p className="text-sm text-white/90">{ar.tracking.helpBody}</p>
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
