import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import s from "./admin.module.css";

export type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Properties whose value differs between the light and dark design files. Each maps to a class in
 * admin.module.css that reads `--<key>-l` in light and `--<key>-d` under `.dark`.
 */
const THEMED = {
  background: "bg",
  color: "fg",
  border: "bd",
  borderColor: "bc",
  borderTop: "bt",
  borderBottom: "bb",
  boxShadow: "sh",
  opacity: "op",
  filter: "fl",
  textShadow: "tsh",
} as const;

type ThemedKey = keyof typeof THEMED;

/**
 * Style for one element from its light and dark design values: `sx(light, darkOverrides)`.
 * Values equal in both stay inline; values that differ become a CSS variable per theme, read by a
 * class that only applies in that theme. A value present in one theme only leaves the other alone.
 */
export function sx(
  light: CSSProperties,
  dark?: CSSProperties,
  className?: string,
): { className?: string; style: CSSProperties } {
  if (!dark) return { className, style: light };
  const style: Vars = {};
  const classes: string[] = [];
  const keys = new Set([...Object.keys(light), ...Object.keys(dark)]) as Set<keyof CSSProperties>;
  for (const key of keys) {
    const l = light[key];
    const d = key in dark ? dark[key] : l;
    if (l === d) {
      (style as Record<string, unknown>)[key] = l;
      continue;
    }
    const short = THEMED[key as ThemedKey];
    if (!short) throw new Error(`sx: no theme switch for "${key}"`);
    if (l !== undefined) {
      style[`--${short}-l`] = String(l);
      classes.push(s[`${short}L`] ?? "");
    }
    if (d !== undefined) {
      style[`--${short}-d`] = String(d);
      classes.push(s[`${short}D`] ?? "");
    }
  }
  return { className: cn(className, ...classes) || undefined, style };
}

/** A single themed property as style + class: `{...tv("color", light, dark)}`. */
export function tv(
  key: ThemedKey,
  light: string | number,
  dark: string | number,
  className?: string,
): { className: string; style: Vars } {
  const short = THEMED[key];
  return {
    className: cn(className, s[`${short}L`], s[`${short}D`]),
    style: { [`--${short}-l`]: String(light), [`--${short}-d`]: String(dark) } as Vars,
  };
}
