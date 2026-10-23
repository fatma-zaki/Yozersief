"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  LOGO_BASE_SIZE,
  LOGO_PARTS,
  LOGO_VIEWBOX,
  MOTIF_STROKES,
  PEN_STROKES,
  SPLASH_TOTAL,
  WRITE_END,
} from "./splash-data";
import styles from "./splash.module.css";

/** المفتاح اللي بيتحفظ في المتصفح بعد أول مرة الزائر يشوف الشاشة. */
const STORAGE_KEY = "yz-splash-seen";
/** مدة اختفاء الشاشة بنعومة (ms). لازم تطابق .leaving في الـ CSS. */
const FADE_OUT_MS = 900;

/** هل الزائر شاف الشاشة قبل كده؟ على السيرفر دايمًا لأ؛ في المتصفح من localStorage. */
function readSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
const subscribeNoop = () => () => {};
function useSeenBefore(always: boolean): boolean {
  const seen = useSyncExternalStore(subscribeNoop, readSeen, () => false);
  return !always && seen;
}

export interface SplashScreenProps {
  /** لو true، الشاشة بتظهر كل مرة (مفيد للتجربة). الافتراضي: أول زيارة بس. */
  always?: boolean;
  /** جملة صغيرة تحت الشعار. ابعت null عشان تخفيها (زي نسخة الموبايل). */
  tagline?: string | null;
}

/**
 * شاشة البداية «الخطّاط»: ريشة بتكتب شعار يوزرسيف حرف حرف.
 *
 * - بتظهر كطبقة فوق الصفحة، فالصفحة بتتحمّل عادي وراها (مش بتأخر الـ LCP).
 * - سكريبت صغير بيشتغل قبل الرسم ويخفيها فورًا للي شافها قبل كده (من غير وميض).
 * - بتحترم prefers-reduced-motion: الشعار بيظهر ثابت وتختفي بسرعة.
 * - حطّها في الصفحة الرئيسية بس، مش في صفحات الطلب أو التتبع أو لوحة الإدارة.
 */
export function SplashScreen({
  always = false,
  tagline = "طباعة على التيشيرتات والهوديز والمجات والكفرات والاستيكرات — أسوان",
}: SplashScreenProps) {
  const uid = useId().replace(/:/g, "");
  const [state, setState] = useState<"showing" | "leaving" | "gone">("showing");
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement>(null);
  const seenBefore = useSeenBefore(always);

  const finish = useCallback(() => {
    setState((s) => (s === "gone" ? s : "leaving"));
    // الصفحة بتبقى قابلة للتمرير من أول ما الشاشة تبدأ تبهت، والهوم بتبان تحتها.
    document.documentElement.style.overflow = "";
    timers.current.push(
      window.setTimeout(() => {
        // العلامة بتتسجّل بعد ما الـ fade يخلص: لو اتسجّلت قبله، useSeenBefore بيقراها في
        // الـ render اللي جاي والشاشة بتختفي مرة واحدة من غير ما تبهت.
        try {
          window.localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* وضع التصفح الخاص أو التخزين مقفول — مفيش مشكلة */
        }
        setState("gone");
        // هامش صغير: الـ transition بيبدأ بعد الـ render بلحظة، فمنقطعش آخر جزء من الـ fade.
      }, FADE_OUT_MS + 100),
    );
  }, []);

  useEffect(() => {
    if (seenBefore) return;
    document.documentElement.removeAttribute("data-splash-seen");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? 1.2 : SPLASH_TOTAL;
    document.documentElement.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });
    timers.current.push(window.setTimeout(finish, total * 1000));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [seenBefore, finish]);

  useEffect(() => {
    if (state === "gone") document.documentElement.style.overflow = "";
  }, [state]);

  if (seenBefore || state === "gone") return null;

  const vars = {
    "--splash-write-end": `${WRITE_END}s`,
    "--splash-total": `${SPLASH_TOTAL}s`,
    "--splash-logo-w": `${LOGO_BASE_SIZE.width}px`,
    "--splash-logo-h": `${LOGO_BASE_SIZE.height}px`,
  } as CSSProperties;

  return (
    <>
      {/* بيشتغل أثناء قراءة الـ HTML، قبل ما الشاشة تترسم، عشان الزائر القديم ما يشوفش وميض */}
      {!always && (
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('${STORAGE_KEY}')==='1')document.documentElement.setAttribute('data-splash-seen','')}catch(e){}`,
          }}
        />
      )}
      <div
        className={`${styles.root} ${state === "leaving" ? styles.leaving : ""}`}
        style={vars}
        role="dialog"
        aria-modal="true"
        aria-label="شاشة البداية: شعار يوزرسيف — خليك مختلف، خليك يوزرسيف"
        data-splash=""
      >
        <div className={styles.glow} aria-hidden="true" />

        <svg className={styles.motif} viewBox="0 0 1000 1000" aria-hidden="true">
          {MOTIF_STROKES.map((m, i) => (
            <path key={i} pathLength={1} d={m.d} style={{ animationDelay: `${m.delay}s` }} />
          ))}
        </svg>

        <div className={styles.center}>
          <div className={styles.stage} aria-hidden="true">
            <svg
              className={styles.logo}
              viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
              width={LOGO_BASE_SIZE.width}
              height={LOGO_BASE_SIZE.height}
            >
              <defs>
                {LOGO_PARTS.map((part) => (
                  <mask
                    key={part.id}
                    id={`${uid}-m${part.id}`}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width={LOGO_VIEWBOX.width}
                    height={LOGO_VIEWBOX.height}
                  >
                    {PEN_STROKES.filter((s) => s.part === part.id).map((s, i) => (
                      <path
                        key={i}
                        className={styles.maskStroke}
                        pathLength={1}
                        d={s.d}
                        strokeWidth={s.width}
                        style={{
                          animationDelay: `${s.delay}s`,
                          animationDuration: `${s.duration}s`,
                        }}
                      />
                    ))}
                  </mask>
                ))}
              </defs>
              {LOGO_PARTS.map((part) => (
                <path
                  key={part.id}
                  d={part.d}
                  fillRule="evenodd"
                  mask={`url(#${uid}-m${part.id})`}
                />
              ))}
              {/* الشعار كامل في الآخر عشان يغطي أي فراغ صغير سابته الريشة */}
              <path
                className={styles.fullFill}
                d={LOGO_PARTS.map((p) => p.d).join(" ")}
                fillRule="evenodd"
                style={{ animationDelay: `${WRITE_END}s` }}
              />
            </svg>

            {PEN_STROKES.filter((s) => s.pen).map((s, i) => (
              <span
                key={i}
                className={styles.quill}
                style={{
                  offsetPath: `path('${s.pen}')`,
                  animationDelay: `${s.delay}s`,
                  animationDuration: `${s.duration}s`,
                }}
              >
                <Quill />
              </span>
            ))}
          </div>

          <p className={styles.slogan}>خليك مختلف .. خليك يوزرسيف</p>
          {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span />
        </div>

        <button ref={skipRef} type="button" className={styles.skip} onClick={finish}>
          تخطي
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19l-7-7 7-7M19 12H5" />
          </svg>
        </button>
      </div>
    </>
  );
}

/** الريشة اللي بتكتب — بلون الشعار (currentColor). السن عند الركن الشمال تحت. */
function Quill() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        className={styles.quillVane}
        d="M22.6 1.4C17.2 2 12.4 5.4 9.6 10.6L8 14.2l1.8 1.8 3.6-1.6c5.2-2.8 8.6-7.6 9.2-13z"
      />
      <path className={styles.quillShaft} d="M1.6 22.4L19.8 4.2" />
      <path className={styles.quillBarb} d="M16.4 7.6l3.2-.6M14.6 10.2l3-.2M12.8 12.6l2.6.2" />
    </svg>
  );
}

export default SplashScreen;
