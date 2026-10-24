import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import s from "./admin.module.css";
import { sx } from "./theme";

/** The glass header at the top of every admin screen: title + subtitle, then the screen's tools. */
export function PageHeader({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      {...sx(
        {
          borderRadius: 24,
          padding: "12px 14px 12px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          boxShadow:
            "0 0 0 1px rgba(126,232,199,0.5), inset 0 1px 0 #ffffff, 0 0 22px rgba(126,232,199,0.2), 0 12px 30px rgba(0,92,88,0.1)",
        },
        {
          borderColor: "rgba(126,232,199,0.3)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 22px rgba(126,232,199,0.12), 0 14px 34px rgba(0,0,0,0.4)",
        },
        cn(s.glass, s.up, className),
      )}
    >
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <h1
          {...sx(
            { margin: 0, fontSize: 24, lineHeight: "36px", fontWeight: 800 },
            { color: "#ffffff" },
          )}
        >
          {title}
        </h1>
        <span
          {...sx({ fontSize: 13, color: "rgba(3,9,9,0.6)" }, { color: "rgba(242,251,248,0.6)" })}
        >
          {subtitle}
        </span>
      </div>
      {children}
    </header>
  );
}
