import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import s from "./admin.module.css";

/** Exact icon paths from the admin designs (docs/design/Admin*.html). Stroke icons, 24×24. */
export const P = {
  dash: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  orders:
    "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01",
  ordersPlain:
    "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
  traffic: "M3 3v18h18M7 15l4-4 3 3 6-7",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  photo:
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  lock: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4",
  sent: "M22 2 11 13M22 2l-7 20-4-9-9-4Z",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
  warn: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  ok: "M20 6 9 17l-5-5",
  no: "M18 6 6 18M6 6l12 12",
  inbox:
    "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  search: "M19 11a8 8 0 1 1-16 0 8 8 0 1 1 16 0M21 21l-4.3-4.3",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0",
  group:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  biz: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
  menu: "M4 6h16M4 12h16M4 18h16",
  truck:
    "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14M19 18a2 2 0 1 1-4 0 2 2 0 1 1 4 0M9 18a2 2 0 1 1-4 0 2 2 0 1 1 4 0",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  eyeOff:
    "M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",
  shieldCheck: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4",
  pen: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4",
  plus: "M12 5v14M5 12h14",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
} as const;

/** `.ic` from the design: 22px, stroke 1.75, round caps. Size and stroke are per use. */
export function Ic({
  d,
  size,
  stroke,
  style,
  className,
  label,
}: {
  d: string;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
  /** Only when the icon is the sole content of something meaningful; decorative otherwise. */
  label?: string;
}) {
  return (
    <svg
      className={cn(s.ic, className)}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      style={{
        ...(size ? { width: size, height: size } : null),
        ...(stroke ? { strokeWidth: stroke } : null),
        ...style,
      }}
    >
      <path d={d} />
    </svg>
  );
}
