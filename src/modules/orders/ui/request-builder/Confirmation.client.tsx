"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ar, t } from "@/i18n/ar";
import { cn } from "@/lib/cn";
import { publicEnv } from "@/public-env";
import type { RequestDraft } from "../../domain/request";
import s from "./builder.module.css";

const b = ar.order.builder;
const TEAL_MARK = "/brand/wordmark-teal.png";
const MINT_MARK = "/brand/wordmark-mint.png";

/** [dx, dy, colour, rotation°] for each confetti piece bursting out of the box. */
const CONFETTI: readonly [number, number, string, number][] = [
  [-150, -120, "#7ee8c7", 200],
  [150, -130, "#d6ae62", -160],
  [-110, -170, "#b8f2de", 120],
  [120, -180, "#00a08f", -220],
  [-180, -40, "#d6ae62", 260],
  [180, -50, "#7ee8c7", -260],
  [-60, -200, "#00a08f", 90],
  [70, -210, "#7ee8c7", -90],
  [-130, 30, "#b8f2de", 180],
  [140, 20, "#d6ae62", -180],
  [-30, -150, "#d6ae62", 300],
  [40, -140, "#b8f2de", -300],
  [-200, -110, "#00a08f", 140],
  [205, -100, "#b8f2de", -140],
];

/** The printed piece that rises out of the box, matching the ordered category. */
function Piece({ cat }: { cat: RequestDraft["cat"] }) {
  switch (cat) {
    case "mug":
      return (
        <g>
          <path
            d="M200 98 q34 2 34 30 q0 28 -34 30"
            fill="none"
            stroke="#e6f6f1"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <rect
            x="104"
            y="70"
            width="104"
            height="116"
            rx="16"
            fill="url(#gift-tee)"
            stroke="#b8f2de"
            strokeWidth="2"
          />
          <ellipse cx="156" cy="72" rx="50" ry="8" fill="#d4efe7" />
          <image href={TEAL_MARK} x="124" y="104" width="64" height="46" />
        </g>
      );
    case "phone":
      return (
        <g>
          <rect
            x="118"
            y="48"
            width="84"
            height="150"
            rx="20"
            fill="#01302d"
            stroke="#7ee8c7"
            strokeWidth="2"
          />
          <rect
            x="130"
            y="60"
            width="26"
            height="30"
            rx="9"
            fill="#032722"
            stroke="#7ee8c7"
            strokeOpacity=".5"
          />
          <circle cx="143" cy="70" r="5" fill="#0a4a44" />
          <circle cx="143" cy="82" r="5" fill="#0a4a44" />
          <image href={MINT_MARK} x="130" y="112" width="60" height="44" />
        </g>
      );
    case "sticker":
      return (
        <g>
          <circle cx="160" cy="118" r="66" fill="url(#gift-tee)" stroke="#b8f2de" strokeWidth="2" />
          <path d="M206 166 q-18 -6 -24 -26 q22 0 30 14 z" fill="#d4efe7" />
          <image href={TEAL_MARK} x="122" y="92" width="76" height="54" />
        </g>
      );
    case "custom":
      return (
        <g>
          <rect
            x="108"
            y="64"
            width="104"
            height="122"
            rx="14"
            fill="url(#gift-tee)"
            stroke="#b8f2de"
            strokeWidth="2"
          />
          <path d="M108 100 H212 M160 64 V186" stroke="#7ee8c7" strokeWidth="8" opacity=".55" />
          <image href={TEAL_MARK} x="130" y="110" width="60" height="44" />
        </g>
      );
    default:
      return (
        <g>
          <path
            d="M112 70 L138 56 Q160 68 182 56 L208 70 L232 98 L212 114 L202 104 L202 186 L118 186 L118 104 L108 114 L88 98 Z"
            fill="url(#gift-tee)"
            stroke="#b8f2de"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M138 56 Q160 74 182 56"
            fill="none"
            stroke="#7ee8c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <image href={TEAL_MARK} x="132" y="92" width="56" height="40" />
        </g>
      );
  }
}

function GiftBox({ cat }: { cat: RequestDraft["cat"] }) {
  return (
    <div className={s.gift} aria-hidden="true">
      <span className={s.giftGlow} />
      {CONFETTI.map(([dx, dy, color, r], i) => (
        <span
          key={i}
          className={s.confetti}
          style={
            {
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              "--r": `${r}deg`,
              background: color,
              animationDelay: `${(0.72 + (i % 4) * 0.04).toFixed(2)}s`,
              ...(i % 3 === 0 ? { borderRadius: 999, width: 10, height: 10 } : {}),
            } as CSSProperties
          }
        />
      ))}
      <svg className={s.giftSvg} viewBox="0 0 320 260">
        <defs>
          <linearGradient id="gift-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00807a" />
            <stop offset="1" stopColor="#004541" />
          </linearGradient>
          <linearGradient id="gift-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#005c58" />
            <stop offset="1" stopColor="#01302d" />
          </linearGradient>
          <linearGradient id="gift-tee" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e6f6f1" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="244" rx="112" ry="10" fill="rgba(0,43,40,0.18)" />
        <path d="M78 150 L160 132 L242 150 L160 168 Z" fill="#01302d" />
        <g className={s.rise}>
          <Piece cat={cat} />
        </g>
        <path d="M78 150 L160 168 L160 238 L78 220 Z" fill="url(#gift-front)" />
        <path d="M242 150 L160 168 L160 238 L242 220 Z" fill="url(#gift-side)" />
        <path d="M150 166 L170 166 L170 236 L150 236 Z" fill="#7ee8c7" opacity=".55" />
        <image
          href={MINT_MARK}
          x="92"
          y="182"
          width="52"
          height="38"
          opacity=".95"
          transform="skewY(12) translate(0 -24)"
        />
        <g className={s.flapL}>
          <path d="M78 150 L160 168 L128 196 L46 176 Z" fill="#00706a" />
        </g>
        <g className={s.flapR}>
          <path d="M242 150 L160 168 L192 196 L274 176 Z" fill="#005c58" />
        </g>
        <g className={s.spark}>
          <path d="M58 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#d6ae62" />
          <path d="M262 54 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#7ee8c7" />
          <path d="M250 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#d6ae62" />
        </g>
      </svg>
    </div>
  );
}

/** Step 6 (design: docs/design/youzersef-order-journey.html, confirmation). */
export function Confirmation({ draft, orderRef }: { draft: RequestDraft; orderRef: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = () => {
    navigator.clipboard?.writeText(orderRef).catch(() => {});
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  };

  const firstName = draft.name.trim().split(/\s+/)[0];
  const whatsapp = `https://wa.me/${publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER}`;
  return (
    <section
      aria-labelledby="ok-h"
      className={cn(
        s.card,
        s.pop,
        "mx-auto flex w-full max-w-[640px] flex-col items-center gap-[18px] overflow-hidden rounded-[32px] px-5 pt-7 pb-8 text-center sm:px-8",
      )}
    >
      <GiftBox cat={draft.cat} />
      <div className="flex flex-col gap-1.5">
        <h1
          id="ok-h"
          tabIndex={-1}
          className={cn(
            s.strong,
            "m-0 text-[30px] leading-[44px] font-extrabold sm:text-4xl sm:leading-[50px]",
          )}
        >
          {b.doneTitleStart} <span className={s.accent}>{b.doneTitleAccent}</span>
        </h1>
        <p className={cn(s.muted, "m-0 text-base leading-[27px]")}>
          {t(b.doneThanks, { name: firstName ? t(b.doneThanksName, { name: firstName }) : "" })}
        </p>
      </div>

      <div
        className={cn(
          s.panelBg,
          s.dk,
          "border-mint/50 relative isolate flex w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border px-[18px] py-4 text-white shadow-[0_0_28px_rgb(126_232_199/0.22)]",
        )}
      >
        <div aria-hidden="true" className={cn(s.panelGlow, "absolute inset-0 -z-10")} />
        <div className="flex flex-col items-start text-right">
          <span className="text-[13px] text-white/75">{b.doneRef}</span>
          <span
            dir="ltr"
            className={cn(
              s.neon,
              "text-[26px] leading-[42px] font-extrabold tracking-[2px] [unicode-bidi:isolate] sm:text-[30px]",
            )}
          >
            {orderRef}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={b.doneCopyLabel}
          className={cn(
            s.btn,
            s.ghost,
            "min-h-[46px] shrink-0 px-[18px] text-sm [&_svg]:size-[18px]",
          )}
        >
          {copied ? (
            <Check aria-hidden="true" strokeWidth={1.75} />
          ) : (
            <Copy aria-hidden="true" strokeWidth={1.75} />
          )}
          <span aria-live="polite">{copied ? b.doneCopied : b.doneCopy}</span>
        </button>
      </div>

      <div className="flex w-full flex-wrap gap-3">
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
          className={cn(
            s.btn,
            s.soft,
            "min-h-[54px] flex-[1_1_200px] text-base [&_svg]:size-[18px]",
          )}
        >
          <MessageCircle aria-hidden="true" strokeWidth={1.75} />
          {b.doneWhatsapp}
        </a>
      </div>
    </section>
  );
}
