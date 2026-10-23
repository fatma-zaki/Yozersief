import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  Circle,
  TriangleAlert,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ar, t } from "@/i18n/ar";
import { cn } from "@/lib/cn";
import type { Check as ReadinessCheck, Readiness } from "../../domain/request";
import s from "./builder.module.css";

const b = ar.order.builder;

export type StepState = "current" | "done" | "issue" | "todo";

/* ───────────── Desktop hero band: glass bar + stepper (design header) ───────────── */

export function BuilderHeader({
  step,
  maxStep,
  stepStates,
  onGo,
  showStepper,
  demo,
}: {
  step: number;
  maxStep: number;
  stepStates: StepState[];
  onGo: (n: number) => void;
  showStepper: boolean;
  demo: boolean;
}) {
  const fill = (Math.max(0, Math.min(4, Math.max(maxStep, step) - 1)) / 4) * 80;
  return (
    <header
      className={cn(
        s.heroBg,
        s.dk,
        "relative isolate hidden overflow-hidden px-6 pt-4 pb-[70px] text-white lg:block",
      )}
    >
      <div aria-hidden="true" className={cn(s.heroGlow, "absolute inset-0 -z-10")} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(
          s.mintGlow,
          "pointer-events-none absolute -top-[180px] -left-[200px] -z-10 size-[560px] opacity-50",
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(
          s.mintGlow,
          "pointer-events-none absolute -top-[60px] -right-[240px] -z-10 size-[480px] rotate-180 opacity-35",
        )}
      />
      <div
        className={cn(
          s.glassD,
          "mx-auto flex max-w-[1280px] items-center gap-3.5 rounded-[26px] py-2 ps-4 pe-3",
        )}
      >
        <Link href="/" aria-label={`${ar.app.name} — ${ar.nav.home}`} className="shrink-0">
          <Image
            src="/brand/logo.jpg"
            alt={`شعار ${ar.app.name}`}
            width={56}
            height={56}
            className="rounded-2xl"
            priority
          />
        </Link>
        <div className="flex grow flex-col">
          <span className="text-xl leading-[30px] font-extrabold">
            {b.headTitleStart} <span className={s.neon}>{b.headTitleNeon}</span>
          </span>
          <span className="text-[13px] text-white/75">{b.headSub}</span>
        </div>
        {demo ? (
          <span className="text-mint-light rounded-pill border-mint/50 bg-mint/[0.12] inline-flex items-center border px-3.5 py-0.5 text-xs font-bold">
            {b.demoBadge}
          </span>
        ) : null}
        <Link
          href="/"
          className={cn(s.btn, s.ghost, "min-h-11 px-[18px] text-sm [&_svg]:size-[18px]")}
        >
          <ArrowRight aria-hidden="true" strokeWidth={1.75} />
          {b.backToSite}
        </Link>
      </div>

      {showStepper ? (
        <nav aria-label={b.stepsNav} className="relative mx-auto mt-[30px] max-w-[900px]">
          <span
            aria-hidden="true"
            className="absolute inset-x-[10%] top-[22px] h-0.5 rounded-sm bg-white/[0.14]"
          />
          <span
            aria-hidden="true"
            className="ease-yz absolute top-[22px] right-[10%] h-0.5 rounded-sm bg-[linear-gradient(270deg,#7ee8c7,#b8f2de)] shadow-[0_0_10px_rgb(126_232_199/0.8)] transition-[width] duration-700"
            style={{ width: `${fill.toFixed(1)}%` }}
          />
          <ol className="relative m-0 grid list-none grid-cols-5 p-0">
            {b.stepShort.map((label, i) => {
              const n = i + 1;
              const state = stepStates[i] ?? "todo";
              const visited = n <= maxStep;
              return (
                <li key={label}>
                  <button
                    type="button"
                    className="flex w-full min-w-0 flex-col items-center gap-2 border-0 bg-transparent p-1 text-white disabled:cursor-default"
                    disabled={!visited}
                    onClick={() => onGo(n)}
                    aria-current={state === "current" ? "step" : undefined}
                    aria-label={`${t(b.stepOf, { n })}: ${label}${state === "done" ? ` ${b.stepDone}` : state === "issue" ? ` ${b.stepIssue}` : ""}`}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "ease-yz flex size-[46px] items-center justify-center rounded-2xl text-base font-extrabold transition-all duration-500",
                        state === "current" &&
                          "border-mint text-mint scale-[1.08] border-[1.5px] bg-[#01302d] shadow-[0_0_18px_rgb(126_232_199/0.6),inset_0_0_10px_rgb(126_232_199/0.2)]",
                        state === "issue" &&
                          "border-gold bg-gold/20 border-[1.5px] text-[#f0d39a] shadow-[0_0_14px_rgb(214_174_98/0.4)]",
                        state === "done" &&
                          "bg-[linear-gradient(180deg,#b8f2de,#7ee8c7)] text-[#01302d] shadow-[0_0_14px_rgb(126_232_199/0.55)]",
                        state === "todo" && "border border-white/20 bg-white/[0.06] text-white/50",
                      )}
                    >
                      {state === "done" ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : state === "issue" ? (
                        "!"
                      ) : (
                        n
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[13px]",
                        state === "current"
                          ? "font-extrabold text-white"
                          : visited
                            ? "font-bold text-white/80"
                            : "font-semibold text-white/50",
                      )}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      ) : (
        <div className="h-10" />
      )}
      <div aria-hidden="true" className={cn(s.arc, "absolute inset-x-[-6%] -bottom-px h-11")} />
    </header>
  );
}

/* ───────────── Phone header (design: Request-Mobile.html) ───────────── */

export function MobileHeader({
  step,
  title,
  sub,
  onBack,
  readiness,
  checks,
  onFix,
  done,
  demo,
}: {
  step: number;
  title: string;
  sub: string;
  onBack: (() => void) | null;
  readiness: Readiness;
  checks: readonly ReadinessCheck[];
  onFix: (c: ReadinessCheck) => void;
  done: boolean;
  demo: boolean;
}) {
  const [first, ...rest] = title.split(" ");
  const attn = readiness.attention[0];
  const iconBtn = cn(s.btn, s.ghost, "size-11 shrink-0 rounded-[14px]! [&_svg]:size-5");
  return (
    <header
      className={cn(
        s.heroBg,
        s.dk,
        "relative isolate overflow-hidden rounded-b-[28px] px-3 pt-3 pb-4 text-white lg:hidden",
      )}
    >
      <div aria-hidden="true" className={cn(s.heroGlow, "absolute inset-0 -z-10")} />
      <div className="flex items-center gap-2">
        <Link href="/" className={iconBtn} aria-label={b.close}>
          <X aria-hidden="true" strokeWidth={1.75} />
        </Link>
        <div className="flex min-w-0 grow flex-col items-center text-center">
          <span className="truncate text-lg leading-7 font-extrabold">
            {done ? (
              <>
                {b.headTitleStart} <span className={s.neon}>{b.headTitleNeon}</span>
              </>
            ) : (
              <>
                {first} <span className={s.neon}>{rest.join(" ")}</span>
              </>
            )}
          </span>
          <span className="truncate text-xs text-white/70">{done ? b.headSub : sub}</span>
        </div>
        {onBack ? (
          <button type="button" className={iconBtn} onClick={onBack} aria-label={b.back}>
            <ArrowRight aria-hidden="true" strokeWidth={1.75} />
          </button>
        ) : (
          <span className="size-11 shrink-0" />
        )}
      </div>
      {demo ? (
        <p className="text-mint-light m-0 mt-2 text-center text-[11px] font-bold">{b.demoBadge}</p>
      ) : null}
      {!done ? (
        <>
          <div aria-hidden="true" className="mt-3 grid grid-cols-5 gap-1.5 px-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1 rounded-full",
                  n <= step ? "bg-mint shadow-[0_0_8px_rgb(126_232_199/0.7)]" : "bg-white/15",
                )}
              />
            ))}
          </div>
          <details className={cn(s.glassD, "group mt-3 rounded-[20px]")}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-[18px]",
                  readiness.ready
                    ? "bg-[linear-gradient(180deg,#b8f2de,#7ee8c7)] text-[#01302d]"
                    : "border-gold bg-gold/[0.18] border text-[#f0d39a]",
                )}
              >
                {readiness.ready ? (
                  <CircleCheck strokeWidth={1.75} />
                ) : (
                  <TriangleAlert strokeWidth={1.75} />
                )}
              </span>
              <span className="grow text-[13px] leading-5 font-bold">
                {t(b.readyMobile, { done: readiness.done, total: readiness.total })}
                {attn ? t(b.readyMobileAttn, { label: attn.label }) : ""}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                strokeWidth={1.75}
              />
              <span className="sr-only">{b.readyToggle}</span>
            </summary>
            <div className="px-2 pb-2">
              <ChecksList checks={checks} onFix={onFix} />
            </div>
          </details>
        </>
      ) : null}
    </header>
  );
}

/* ───────────── Readiness panel ───────────── */

function ChecksList({
  checks,
  onFix,
}: {
  checks: readonly ReadinessCheck[];
  onFix: (c: ReadinessCheck) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {checks.map((c) => (
        <li
          key={c.id}
          className={cn(s.glassD, "flex items-center gap-2.5 rounded-[18px] px-3 py-2.5")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-[18px]",
              c.status === "ok" &&
                "bg-[linear-gradient(180deg,#b8f2de,#7ee8c7)] text-[#01302d] shadow-[0_0_10px_rgb(126_232_199/0.5)]",
              c.status === "attn" && "border-gold bg-gold/[0.18] border text-[#f0d39a]",
              c.status === "opt" && "border border-white/20 bg-white/[0.06] text-white/55",
            )}
          >
            {c.status === "ok" ? (
              <CircleCheck strokeWidth={1.75} />
            ) : c.status === "attn" ? (
              <TriangleAlert strokeWidth={1.75} />
            ) : (
              <Circle className="size-2.5!" strokeWidth={2} />
            )}
          </span>
          <div className="flex min-w-0 grow flex-col">
            <span className="text-sm leading-[22px] font-bold">
              {c.label}{" "}
              <span
                className={cn(
                  "text-[11px] font-bold",
                  c.status === "attn"
                    ? "text-[#f0d39a]"
                    : c.status === "ok"
                      ? "text-mint"
                      : "text-white/60",
                )}
              >
                {b.tags[c.status]}
              </span>
            </span>
            <span className="text-xs leading-[18px] text-white/72">{c.msg}</span>
          </div>
          {c.status === "attn" ? (
            <button
              type="button"
              onClick={() => onFix(c)}
              aria-label={t(b.fixLabel, { label: c.label })}
              className={cn(
                s.btn,
                "border-gold bg-gold/[0.14] min-h-[34px] shrink-0 border px-3 text-xs text-[#f0d39a]",
              )}
            >
              {b.fix}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ReadinessAside({
  checks,
  readiness,
  onFix,
}: {
  checks: readonly ReadinessCheck[];
  readiness: Readiness;
  onFix: (c: ReadinessCheck) => void;
}) {
  const pct = readiness.total ? Math.round((readiness.done / readiness.total) * 100) : 0;
  const n = readiness.attention.length;
  return (
    <aside
      aria-labelledby="ra-h"
      className={cn(
        s.panelBg,
        s.dk,
        s.animUp,
        s.d1,
        "border-mint/45 sticky top-4 isolate hidden min-w-0 flex-col gap-4 overflow-hidden rounded-[30px] border p-6 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_0_30px_rgb(126_232_199/0.2),0_20px_44px_rgb(0_0_0/0.2)] lg:flex",
      )}
    >
      <div aria-hidden="true" className={cn(s.panelGlow, "absolute inset-0 -z-10")} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(
          s.mintGlow,
          "pointer-events-none absolute -right-40 -bottom-[150px] -z-10 size-[380px] opacity-35",
        )}
      />
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            s.ringIn,
            "flex size-[84px] shrink-0 items-center justify-center rounded-full shadow-[0_0_22px_rgb(126_232_199/0.45)] transition-[background] duration-500",
          )}
          style={{
            background: `conic-gradient(#7ee8c7 0 ${pct}%, rgb(255 255 255 / 0.12) ${pct}% 100%)`,
          }}
        >
          <span
            className={cn(
              s.panelBg,
              "flex size-[66px] flex-col items-center justify-center rounded-full leading-none",
            )}
          >
            <strong className="text-xl">{readiness.done}</strong>
            <span className="text-[11px] text-white/70">
              {t(b.readyOf, { n: readiness.total })}
            </span>
          </span>
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="ra-h" className="m-0 text-xl leading-[30px] font-extrabold">
            {b.readyTitleStart} <span className={s.neon}>{b.readyTitleNeon}</span>
          </h2>
          <p aria-live="polite" className="m-0 text-sm leading-[22px] text-white/82">
            {n === 0 ? b.readyAll : n === 1 ? b.readyOne : t(b.readyMany, { n })}
          </p>
        </div>
      </div>
      <ChecksList checks={checks} onFix={onFix} />
      <p className="m-0 text-xs leading-5 text-white/70">{b.readyNote}</p>
    </aside>
  );
}
