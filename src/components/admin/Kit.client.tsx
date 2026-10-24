"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import s from "./admin.module.css";
import { Ic, P } from "./Ic";
import k from "./kit.module.css";

/** The glass header bar of the variable-based screens (`.card.bar`): title, subtitle, tools. */
export function KitHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn(k.card, k.bar, s.up)} data-ornament="320">
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <h1 className={k.h1}>{title}</h1>
        <span className={k.muted} style={{ fontSize: 13 }}>
          {subtitle}
        </span>
      </div>
      {children}
    </header>
  );
}

/** `.sw` toggle from the designs. */
export function Switch({
  on,
  onToggle,
  label,
  labelledBy,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(k.sw, on ? k.swOn : k.swOff)}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={onToggle}
      disabled={disabled}
    />
  );
}

/** The designs' `flash()`: a toast that hides itself after 3.2s. */
export function useFlash() {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback((m: string) => {
    clearTimeout(timer.current);
    setToast(m);
    timer.current = setTimeout(() => setToast(""), 3200);
  }, []);
  return { toast, flash, hide: () => setToast("") };
}

/** `children` sit before the close button (e.g. a «افتح واتساب» link). */
export function KitToast({
  text,
  onClose,
  children,
}: {
  text: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!text) return null;
  return (
    <div className={cn(k.toast, s.pop)} role="status">
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 999,
          background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
          color: "#01302d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ic d={P.ok} size={16} stroke={2.6} />
      </span>
      <span style={{ flexGrow: 1 }}>{text}</span>
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق الإشعار"
        style={{
          width: 32,
          height: 32,
          border: 0,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}

/** Focus an element (by ref) right after a panel opens, as the designs do. */
export function useFocusOnOpen<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  return ref;
}
