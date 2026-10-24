import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import s from "./admin.module.css";
import { sx } from "./theme";

/** The dark band at the top of the phone screens (Admin-Mobile, Admin-Traffic-Mobile). */
export function MobileHeader({
  title,
  sub,
  action,
  children,
}: {
  title: ReactNode;
  sub: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header
      {...sx(
        {
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          background: "#01302d",
          color: "#ffffff",
          borderRadius: "0 0 28px 28px",
          padding: "max(12px, env(safe-area-inset-top)) 12px 16px",
          boxShadow: "0 1px 0 rgba(126,232,199,0.6), 0 10px 28px rgba(126,232,199,0.22)",
        },
        {
          background: "#001b17",
          borderBottom: "1px solid rgba(126,232,199,0.35)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.4), 0 0 22px rgba(126,232,199,0.12)",
        },
        s.dk,
      )}
    >
      <div
        aria-hidden="true"
        {...sx(
          {
            position: "absolute",
            zIndex: -1,
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 90% at 75% 10%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)",
          },
          {
            background:
              "radial-gradient(ellipse 80% 90% at 75% 10%, rgba(5,64,57,0.9) 0%, rgba(5,64,57,0) 100%)",
          },
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        {...sx(
          {
            position: "absolute",
            zIndex: -1,
            top: -120,
            left: -150,
            width: 330,
            height: 330,
            opacity: 0.5,
            pointerEvents: "none",
          },
          { opacity: 0.45 },
          s.ornament,
        )}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image
          width={46}
          height={46}
          src="/brand/logo.jpg"
          alt="شعار يوزرسيف"
          {...sx(
            {
              width: 46,
              height: 46,
              borderRadius: 14,
              boxShadow: "0 0 0 1px rgba(126,232,199,0.4), 0 0 14px rgba(126,232,199,0.25)",
            },
            { boxShadow: "0 0 0 1px rgba(126,232,199,0.35), 0 0 14px rgba(126,232,199,0.2)" },
          )}
        />
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <h1 style={{ margin: 0, fontSize: 21, lineHeight: "30px", fontWeight: 800 }}>{title}</h1>
          {sub}
        </div>
        {action}
      </div>
      {children}
    </header>
  );
}

/** «لوحة <neon>الطلبات</neon>»: the neon word in a mobile title. */
export function Neon({ children }: { children: ReactNode }) {
  return (
    <span className={cn(s.neon)} style={{ color: "#7ee8c7" }}>
      {children}
    </span>
  );
}
