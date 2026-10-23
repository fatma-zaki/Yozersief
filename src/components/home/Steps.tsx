import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { STEPS } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Glow, NeonDark, Ornament, SectionHead, type Bp, type Vars } from "./parts";

/** «خطوات بسيطة» — how an order works (design: how section). */
export function Steps() {
  return (
    <section
      id="how"
      aria-labelledby="how-h"
      className={cn(s.section, s.bg, s.reveal)}
      style={{ "--bg-l": "transparent", "--bg-d": "#001b17" } as Vars}
    >
      {/* Desktop */}
      <div
        className={cn(s.d, s.pad)}
        style={
          { position: "relative", "--pad-l": "56px 24px 88px", "--pad-d": "72px 24px 88px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 85% 40%, rgba(126,232,199,0.3) 0, rgba(126,232,199,0) 26%), radial-gradient(circle at 15% 70%, rgba(126,232,199,0.25) 0, rgba(126,232,199,0) 24%)"
          dark="radial-gradient(ellipse 30% 50% at 85% 40%, rgba(5,64,57,0.55) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 30% 50% at 15% 70%, rgba(5,64,57,0.45) 0%, rgba(5,64,57,0) 100%)"
        />
        <Ornament tone="teal" style={{ top: -60, left: -240, width: 560, height: 560 }} dark=".3" />
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 40,
          }}
        >
          <Head bp="d" id="how-h" />
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {STEPS.map((step, i) => (
              <Fragment key={step.n}>
                <li
                  style={{
                    flex: "1 1 200px",
                    maxWidth: 250,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 10,
                  }}
                >
                  <Badge bp="d" n={step.n} icon={step.icon} />
                  <Title bp="d" n={step.n} t={step.t} />
                  <p className={s.muted} style={{ margin: 0, fontSize: 14, lineHeight: "24px" }}>
                    {step.s.d}
                  </p>
                </li>
                {i < STEPS.length - 1 ? (
                  <li
                    aria-hidden="true"
                    className={cn(s.fg, s.op)}
                    style={
                      {
                        display: "flex",
                        alignItems: "center",
                        height: 88,
                        "--fg-l": "#005c58",
                        "--fg-d": "#7ee8c7",
                        "--op-l": ".55",
                        "--op-d": ".6",
                      } as Vars
                    }
                  >
                    <Icon name="chevronStart" size={28} />
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ol>
        </div>
      </div>

      {/* Tablet */}
      <div
        className={cn(s.t, s.pad)}
        style={
          { position: "relative", "--pad-l": "40px 24px 72px", "--pad-d": "72px 24px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 85% 50%, rgba(126,232,199,0.3) 0, rgba(126,232,199,0) 35%)"
          dark="radial-gradient(ellipse 45% 50% at 85% 50%, rgba(5,64,57,0.55) 0%, rgba(5,64,57,0) 100%)"
        />
        <Head bp="t" className={s.mb} style={{ "--mb-l": "36px", "--mb-d": "40px" } as Vars} />
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {STEPS.map((step) => (
            <li
              key={step.n}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 8,
              }}
            >
              <Badge bp="t" n={step.n} icon={step.icon} />
              <Title bp="t" n={step.n} t={step.t} />
              <p className={s.muted} style={{ margin: 0, fontSize: 13, lineHeight: "22px" }}>
                {step.s.t}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Mobile */}
      <div
        className={cn(s.m, s.pad)}
        style={
          { position: "relative", "--pad-l": "32px 16px 56px", "--pad-d": "56px 16px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 85% 50%, rgba(126,232,199,0.3) 0, rgba(126,232,199,0) 45%)"
          dark="radial-gradient(ellipse 70% 50% at 85% 50%, rgba(5,64,57,0.55) 0%, rgba(5,64,57,0) 100%)"
        />
        <Head bp="m" style={{ marginBottom: 26 }} />
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "24px 12px",
          }}
        >
          {STEPS.map((step) => (
            <li
              key={step.n}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 8,
              }}
            >
              <Badge bp="m" n={step.n} icon={step.icon} />
              <Title bp="m" n={step.n} t={step.t} />
              <p className={s.muted} style={{ margin: 0, fontSize: 12, lineHeight: "20px" }}>
                {step.s.m}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Head({
  bp,
  id,
  style,
  className,
}: {
  bp: Bp;
  id?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <SectionHead
      bp={bp}
      id={id}
      pill="خطوات بسيطة"
      title={
        <>
          كيف يعمل <NeonDark>طلبك؟</NeonDark>
        </>
      }
      // The mobile design drops the lead line.
      lead={bp === "m" ? undefined : "من الفكرة إلى المنتج بخطوات سهلة وسريعة"}
      style={style}
      className={className}
    />
  );
}

const BADGE = {
  d: { tile: 88, icon: 36, no: 30, off: -8, font: 14, glow: 14 },
  t: { tile: 80, icon: 32, no: 28, off: -7, font: 13, glow: 12 },
  m: { tile: 72, icon: 30, no: 26, off: -6, font: 13, glow: 12 },
} as const;

function Badge({ bp, n, icon }: { bp: Bp; n: string; icon: (typeof STEPS)[number]["icon"] }) {
  const b = BADGE[bp];
  return (
    <div style={{ position: "relative" }}>
      <span className={s.tile} aria-hidden="true" style={{ width: b.tile, height: b.tile }}>
        <Icon name={icon} size={b.icon} stroke={1.5} />
      </span>
      <span
        aria-hidden="true"
        className={s.stepNo}
        style={{
          bottom: b.off,
          left: b.off,
          width: b.no,
          height: b.no,
          fontSize: b.font,
          boxShadow: `0 0 ${b.glow}px rgba(126,232,199,0.7)`,
        }}
      >
        {n}
      </span>
    </div>
  );
}

const TITLE = {
  d: { mt: 8, size: 20, line: 32 },
  t: { mt: 8, size: 17, line: 28 },
  m: { mt: 6, size: 16, line: 26 },
} as const;

function Title({ bp, n, t }: { bp: Bp; n: string; t: string }) {
  const c = TITLE[bp];
  return (
    <h3
      className={s.ink}
      style={{
        margin: `${c.mt}px 0 0`,
        fontSize: c.size,
        lineHeight: `${c.line}px`,
        fontWeight: 800,
      }}
    >
      <span className={s.srOnly}>الخطوة {n}: </span>
      {t}
    </h3>
  );
}
