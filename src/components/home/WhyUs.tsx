import { cn } from "@/lib/cn";
import { WHY } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Curve, Glow, Neon, SectionHead, type Bp, type Vars } from "./parts";

const TITLE = (
  <>
    لماذا يختارنا <Neon>عملاؤنا؟</Neon>
  </>
);

/** «مميزاتنا» — dark band in the light design (design: why-us section). */
export function WhyUs() {
  return (
    <section
      aria-labelledby="why-h"
      className={cn(s.section, s.bg, s.onDarkBand, s.reveal)}
      style={{ "--bg-l": "#01302d", "--bg-d": "#001412", color: "#ffffff" } as Vars}
    >
      {/* Desktop */}
      <div className={cn(s.d)} style={{ position: "relative", padding: "110px 24px 130px" }}>
        <Curve bp="d" edge="top" />
        <Glow
          light="radial-gradient(ellipse 50% 70% at 50% 50%, rgba(0,92,88,0.85) 0%, rgba(0,92,88,0) 100%)"
          dark="radial-gradient(ellipse 50% 70% at 50% 50%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%)"
        />
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 44,
          }}
        >
          <Head bp="d" id="why-h" />
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 20,
            }}
          >
            {WHY.map((w) => (
              <li
                key={w.t.d}
                className={cn(s.wcard, s.glDark)}
                style={{
                  borderRadius: 26,
                  padding: "30px 22px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 12,
                }}
              >
                <span className={s.ring} aria-hidden="true" style={{ width: 72, height: 72 }}>
                  <Icon name={w.icon} size={32} stroke={1.5} />
                </span>
                <h3
                  className={s.onDark}
                  style={{ margin: 0, fontSize: 20, lineHeight: "32px", fontWeight: 800 }}
                >
                  {w.t.d}
                </h3>
                <p
                  className={s.onDarkMuted}
                  style={{ margin: 0, fontSize: 14, lineHeight: "24px" }}
                >
                  {w.s.d}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <Curve bp="d" edge="bottom" />
      </div>

      {/* Tablet */}
      <div
        className={cn(s.t, s.pad)}
        style={
          { position: "relative", "--pad-l": "88px 24px 100px", "--pad-d": "72px 24px" } as Vars
        }
      >
        <Curve bp="t" edge="top" />
        <Glow
          light="radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,92,88,0.85) 0%, rgba(0,92,88,0) 100%)"
          dark="radial-gradient(ellipse 60% 60% at 50% 50%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%)"
        />
        <Head bp="t" style={{ marginBottom: 32 }} />
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 18,
          }}
        >
          {WHY.map((w) => (
            <li
              key={w.t.t}
              className={cn(s.glDark, s.hoverLift)}
              style={{
                borderRadius: 24,
                padding: "24px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span className={s.ring} aria-hidden="true" style={{ width: 64, height: 64 }}>
                <Icon name={w.icon} size={30} stroke={1.5} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <h3
                  className={s.onDark}
                  style={{ margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 800 }}
                >
                  {w.t.t}
                </h3>
                <p
                  className={s.onDarkMuted}
                  style={{ margin: 0, fontSize: 13, lineHeight: "22px" }}
                >
                  {w.s.t}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <Curve bp="t" edge="bottom" />
      </div>

      {/* Mobile */}
      <div
        className={cn(s.m, s.pad)}
        style={
          { position: "relative", "--pad-l": "64px 16px 72px", "--pad-d": "56px 16px" } as Vars
        }
      >
        <Curve bp="m" edge="top" />
        <Glow
          light="radial-gradient(ellipse 90% 50% at 50% 50%, rgba(0,92,88,0.85) 0%, rgba(0,92,88,0) 100%)"
          dark="radial-gradient(ellipse 90% 50% at 50% 50%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%)"
        />
        <Head bp="m" style={{ marginBottom: 24 }} />
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {WHY.map((w) => (
            <li
              key={w.t.m}
              className={cn(s.glDark, s.hoverLift)}
              style={{
                borderRadius: 22,
                padding: "20px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 8,
              }}
            >
              <span className={s.ring} aria-hidden="true" style={{ width: 54, height: 54 }}>
                <Icon name={w.icon} size={26} stroke={1.5} />
              </span>
              <h3
                className={s.onDark}
                style={{ margin: 0, fontSize: 16, lineHeight: "26px", fontWeight: 800 }}
              >
                {w.t.m}
              </h3>
              <p className={s.onDarkMuted} style={{ margin: 0, fontSize: 12, lineHeight: "20px" }}>
                {w.s.m}
              </p>
            </li>
          ))}
        </ul>
        <Curve bp="m" edge="bottom" />
      </div>
    </section>
  );
}

function Head({ bp, id, style }: { bp: Bp; id?: string; style?: React.CSSProperties }) {
  return (
    <SectionHead
      bp={bp}
      id={id}
      onBand
      pill="مميزاتنا"
      title={TITLE}
      lead={
        bp === "m"
          ? "الجودة، السرعة، والتصميم الاحترافي."
          : "نقدم لك تجربة طباعة مميزة تجمع بين الجودة، السرعة، والتصميم الاحترافي."
      }
      style={style}
    />
  );
}
