import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Glow, Neon, type Vars } from "./parts";

const TITLE = (
  <>
    لديك فكرة <Neon>مميزة؟</Neon>
  </>
);

/** «لديك فكرة مميزة؟» call-to-action banner (design: idea banner). */
export function IdeaBanner() {
  return (
    <section
      aria-labelledby="idea-h"
      className={cn(s.bg, s.reveal)}
      style={{ "--bg-l": "transparent", "--bg-d": "#001b17" } as Vars}
    >
      {/* Desktop */}
      <div className={s.d} style={{ padding: "0 24px 88px" }}>
        <div
          className={cn(s.ideaBox, s.sh)}
          style={
            {
              maxWidth: 1240,
              margin: "0 auto",
              borderRadius: 32,
              minHeight: 250,
              display: "flex",
              alignItems: "center",
              "--sh-l":
                "inset 0 1px 0 rgba(255,255,255,0.15), 0 0 30px rgba(126,232,199,0.25), 0 24px 50px rgba(0,43,40,0.3)",
              "--sh-d":
                "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 30px rgba(126,232,199,0.2), 0 24px 50px rgba(0,0,0,0.4)",
            } as Vars
          }
        >
          <Glow
            light="radial-gradient(ellipse 50% 90% at 80% 50%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)"
            dark="none"
          />
          {/* `fill` images are always 100% wide, so the wrapper sets the 52% width. */}
          <div
            className={s.ctaScene}
            style={{ position: "absolute", zIndex: -1, inset: "0 auto 0 0", width: "52%" }}
          >
            <Image
              src="/images/home/idea-scene.jpg"
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 1100px) 650px, 1px"
              style={{ objectFit: "cover", objectPosition: "center 70%" }}
            />
          </div>
          <div
            style={{
              padding: "40px 48px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 12,
              maxWidth: 560,
            }}
          >
            <h2
              id="idea-h"
              style={{
                margin: 0,
                fontSize: 38,
                lineHeight: "54px",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {TITLE}
            </h2>
            <Lead size={17} line={30} />
            <Cta mt={8} gap={12} minH={56} pad="12px 34px" font={17} />
          </div>
        </div>
      </div>

      {/* Tablet */}
      <div className={s.t} style={{ padding: "0 24px 72px" }}>
        <div
          className={cn(s.ideaBox, s.sh)}
          style={
            {
              borderRadius: 30,
              minHeight: 230,
              display: "flex",
              alignItems: "center",
              "--sh-l":
                "inset 0 1px 0 rgba(255,255,255,0.15), 0 0 28px rgba(126,232,199,0.25), 0 20px 44px rgba(0,43,40,0.3)",
              "--sh-d":
                "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 28px rgba(126,232,199,0.2), 0 20px 44px rgba(0,0,0,0.4)",
            } as Vars
          }
        >
          <Glow
            light="radial-gradient(ellipse 50% 90% at 80% 50%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)"
            dark="none"
          />
          <div
            style={{
              position: "absolute",
              zIndex: -1,
              inset: "0 auto 0 0",
              width: "50%",
              WebkitMaskImage: "linear-gradient(to left, transparent 0%, #000 45%)",
              maskImage: "linear-gradient(to left, transparent 0%, #000 45%)",
            }}
          >
            <Image
              src="/images/home/idea-scene.jpg"
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 700px) and (max-width: 1099px) 420px, 1px"
              style={{ objectFit: "cover", objectPosition: "center 70%" }}
            />
          </div>
          <div
            style={{
              padding: "32px 36px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 10,
              maxWidth: 420,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: "48px",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {TITLE}
            </h2>
            <Lead size={16} line={28} />
            <Cta mt={6} gap={12} minH={54} pad="12px 30px" font={16} />
          </div>
        </div>
      </div>

      {/* Mobile: text first, the scene below it */}
      <div className={s.m} style={{ padding: "0 16px 56px" }}>
        <div
          className={cn(s.ideaBox, s.sh)}
          style={
            {
              borderRadius: 26,
              "--sh-l": "inset 0 1px 0 rgba(255,255,255,0.15), 0 0 26px rgba(126,232,199,0.25)",
              "--sh-d": "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 26px rgba(126,232,199,0.18)",
            } as Vars
          }
        >
          <Glow
            light="radial-gradient(ellipse 80% 60% at 70% 30%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)"
            dark="none"
          />
          <div
            className={s.pad}
            style={
              {
                "--pad-l": "26px 22px 18px",
                "--pad-d": "26px 22px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
              } as Vars
            }
          >
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                lineHeight: "40px",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {TITLE}
            </h2>
            <Lead size={14} line={24} />
            <Cta mt={8} gap={10} minH={50} pad="10px 26px" font={16} />
          </div>
          <Image
            src="/images/home/hero-scene.jpg"
            alt=""
            aria-hidden="true"
            width={825}
            height={900}
            sizes="(max-width: 699px) 100vw, 1px"
            style={{
              display: "block",
              width: "100%",
              height: 160,
              objectFit: "cover",
              objectPosition: "50% 70%",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 40%)",
              maskImage: "linear-gradient(to bottom, transparent, #000 40%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function Lead({ size, line }: { size: number; line: number }) {
  return (
    <p
      className={s.fg}
      style={
        {
          margin: 0,
          fontSize: size,
          lineHeight: `${line}px`,
          "--fg-l": "rgba(255,255,255,0.85)",
          "--fg-d": "rgba(242,251,248,0.78)",
        } as Vars
      }
    >
      حوّلها إلى مطبوعات فريدة مع يوزرسيف
    </p>
  );
}

function Cta({
  mt,
  gap,
  minH,
  pad,
  font,
}: {
  mt: number;
  gap: number;
  minH: number;
  pad: string;
  font: number;
}) {
  return (
    <Link
      href="/order"
      className={cn(s.btn, s.cta)}
      style={{
        marginTop: mt,
        display: "inline-flex",
        alignItems: "center",
        gap,
        minHeight: minH,
        padding: pad,
        borderRadius: 999,
        fontSize: font,
        fontWeight: 800,
      }}
    >
      ابدأ طلبك الآن
      <Icon name="arrowStart" stroke={2.2} />
    </Link>
  );
}
