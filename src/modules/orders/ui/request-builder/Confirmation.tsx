import {
  Check,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FileText,
  MessageCircle,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ar, t } from "@/i18n/ar";
import { cn } from "@/lib/cn";
import { publicEnv } from "@/public-env";
import type { RequestDraft } from "../../domain/request";
import s from "./builder.module.css";

const b = ar.order.builder;

function nextSteps(d: RequestDraft): { icon: LucideIcon; text: string }[] {
  if (d.ctype !== "biz" && d.ctype !== "group") {
    return [
      { icon: Search, text: b.donePerson[0] },
      { icon: MessageCircle, text: b.donePerson[1] },
      { icon: ClipboardList, text: b.donePerson[2] },
    ];
  }
  return [
    { icon: FileText, text: `${b.doneOrgQuote}${d.email.trim() ? b.doneOrgQuoteEmail : ""}.` },
    { icon: Eye, text: t(b.doneOrgMockup, { sample: d.sample ? b.doneOrgSample : "" }) },
    { icon: CircleDollarSign, text: b.doneOrgDeposit },
    {
      icon: Truck,
      text: `${t(b.doneOrgDelivery, {
        how: d.batches ? b.doneOrgBatches : b.doneOrgOnce,
        invoice: d.invoice ? b.doneOrgInvoice : "",
      })}.`,
    },
    { icon: ClipboardList, text: b.doneOrgTrack },
  ];
}

/** Step 6 (design: Flow-P6 / Flow-B6). */
export function Confirmation({
  draft,
  orderRef,
  onRestart,
}: {
  draft: RequestDraft;
  orderRef: string;
  onRestart: () => void;
}) {
  const org = draft.ctype === "biz" || draft.ctype === "group" ? draft.ctype : null;
  const whatsapp = `https://wa.me/${publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER}`;
  return (
    <section
      aria-labelledby="ok-h"
      className={cn(
        s.card,
        s.pop,
        "mx-auto flex w-full max-w-[780px] flex-col gap-6 rounded-[32px] px-5 py-8 sm:p-10",
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className={cn(
            s.ringIn,
            "flex size-[92px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#b8f2de,#7ee8c7)] text-[#01302d] shadow-[0_0_0_8px_rgb(126_232_199/0.2),0_0_40px_rgb(126_232_199/0.7)]",
          )}
        >
          <Check className="size-10" strokeWidth={2.5} />
        </span>
        <h1
          id="ok-h"
          tabIndex={-1}
          className={cn(
            s.strong,
            "m-0 text-[32px] leading-[48px] font-extrabold sm:text-[38px] sm:leading-[54px]",
          )}
        >
          {b.doneTitleStart} <span className={s.accent}>{b.doneTitleAccent}</span>
        </h1>
        <p className={cn(s.muted, "m-0 text-base leading-7")}>{b.doneSub}</p>
      </div>

      <div
        className={cn(
          s.panelBg,
          s.dk,
          "border-mint/50 relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border p-6 text-white shadow-[0_0_28px_rgb(126_232_199/0.25)]",
        )}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_120%_at_80%_0%,rgb(0_92_88/0.95)_0%,transparent_100%)]"
        />
        <div className="flex flex-col">
          <span className="text-[13px] text-white/75">{b.doneRef}</span>
          <span
            dir="ltr"
            className={cn(
              s.neon,
              "text-[30px] leading-[46px] font-extrabold tracking-[2px] [unicode-bidi:isolate] sm:text-[34px]",
            )}
          >
            {orderRef}
          </span>
        </div>
        <span className="text-mint-light rounded-pill border-mint/50 bg-mint/[0.12] border px-4 py-1.5 text-sm font-bold">
          {b.doneStatus}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className={cn(s.strong, "m-0 text-xl leading-8 font-extrabold")}>{b.doneNext}</h2>
        {org ? (
          <p className={cn(s.muted, "m-0 text-sm leading-6")}>
            {t(b.doneOrgPath, { org: b.doneOrgWord[org] })}
          </p>
        ) : null}
        <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
          {nextSteps(draft).map(({ icon: Icon, text }, i) => (
            <li key={text} className={cn(s.tint, "flex flex-col gap-2 p-3.5")}>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn(s.tile, "size-10 [&_svg]:size-5")}>
                  <Icon strokeWidth={1.75} />
                </span>
                <span className={cn(s.muted, "text-xs font-extrabold")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="text-sm leading-[23px]">{text}</span>
            </li>
          ))}
        </ol>
        <p className={cn(s.muted, "m-0 text-[13px] leading-[22px]")}>
          {org ? b.doneNoteOrg : b.doneNotePerson}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/track"
          className={cn(s.btn, s.cta, "min-h-[54px] flex-[1_1_200px] text-base font-extrabold")}
        >
          {b.doneTrack}
        </Link>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(s.btn, s.soft, "min-h-[54px] flex-[1_1_200px] text-base [&_svg]:size-5")}
        >
          <MessageCircle aria-hidden="true" strokeWidth={1.75} />
          {b.doneWhatsapp}
        </a>
      </div>
      <button
        type="button"
        onClick={onRestart}
        className={cn(
          s.accent,
          "min-h-11 self-center border-0 bg-transparent px-4 py-2 text-[15px] font-bold underline",
        )}
      >
        {b.doneRestart}
      </button>
    </section>
  );
}
