import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { ar } from "@/i18n/ar";
import { cn } from "@/lib/cn";
import { normalizeDigits } from "@/lib/format";
import s from "./builder.module.css";

/** Small building blocks shared by the steps (design: Request.html). */

export const digitsOnly = (v: string) => normalizeDigits(v).replace(/[^0-9]/g, "");
export const decimalOnly = (v: string) => normalizeDigits(v).replace(/[^0-9.]/g, "");

export function Optional() {
  return <span className={cn(s.muted, "font-medium")}> {ar.order.builder.optional}</span>;
}

export function ErrorText({ children, id }: { children?: string | undefined; id?: string }) {
  if (!children) return null;
  return (
    <span id={id} className={s.err}>
      {children}
    </span>
  );
}

/** Label + control + hint + error. `id` is the control's id; hint/error ids derive from it. */
export function FieldBox({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  error?: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className={s.lbl} htmlFor={id}>
        {label}
        {optional ? <Optional /> : null}
      </label>
      {children}
      {hint ? (
        <span id={`${id}-hint`} className={s.hint}>
          {hint}
        </span>
      ) : null}
      <ErrorText id={`${id}-err`}>{error}</ErrorText>
    </div>
  );
}

/** aria props for a control inside FieldBox. */
export function fieldAria(id: string, error: string | undefined, hasHint = false) {
  const describedBy = [hasHint ? `${id}-hint` : "", error ? `${id}-err` : ""]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    "aria-invalid": error ? true : undefined,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  };
}

/** Big selectable card with an icon tile (customer type, receipt method). */
export function OptionCard({
  name,
  checked,
  onSelect,
  icon,
  title,
  desc,
  className,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
  className?: string;
}) {
  return (
    <label className={cn(s.ocard, className)} data-on={checked}>
      <input className={s.srInput} type="radio" name={name} checked={checked} onChange={onSelect} />
      <span aria-hidden="true" className={cn(s.tile, "size-[46px] [&_svg]:size-[22px]")}>
        {icon}
      </span>
      <span className="flex flex-col">
        <span className={cn(s.strong, "text-base font-extrabold")}>{title}</span>
        <span className={cn(s.muted, "text-[13px] leading-5")}>{desc}</span>
      </span>
    </label>
  );
}

/** Card with a switch (bulk options, invoice, design help). */
export function SwitchCard({
  id,
  checked,
  onChange,
  title,
  desc,
  className,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  desc: string;
  className?: string;
}) {
  return (
    <label id={id} className={cn(s.ocard, className)} data-on={checked}>
      <input
        className={s.srInput}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span aria-hidden="true" className={s.sw} data-on={checked} />
      <span className="flex flex-col">
        <span className={cn(s.strong, "text-[15px] font-extrabold")}>{title}</span>
        <span className={cn(s.muted, "text-[13px] leading-5")}>{desc}</span>
      </span>
    </label>
  );
}

/** Pill option (product type, print place). */
export function ChipOption({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className={cn(s.opt, checked ? s.chipOn : s.chipOff)}>
      <input className={s.srInput} type={type} name={name} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

/**
 * Whole-number input. On phones it gets − / + buttons (design: Request-Mobile.html);
 * on larger screens it is a plain field like the desktop design.
 */
export function QtyInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  label,
  big,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
  big?: boolean;
}) {
  const n = Number.parseInt(value || "0", 10) || 0;
  const step = (delta: number) => {
    const next = Math.max(0, n + delta);
    onChange(next === 0 ? "" : String(next));
  };
  const b = ar.order.builder;
  const stepBtn = cn(s.btn, s.soft, "size-11 shrink-0 rounded-full lg:hidden! [&_svg]:size-4");
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={stepBtn}
        onClick={() => step(-1)}
        aria-label={label ? `${b.decrease} ${label}` : b.decrease}
        disabled={n <= 0}
      >
        <Minus aria-hidden="true" strokeWidth={2} />
      </button>
      <input
        className={cn(
          s.fld,
          "min-w-0 text-center lg:text-start",
          big && "text-xl! font-extrabold lg:text-center",
        )}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {...(label ? { "aria-label": label } : {})}
      />
      <button
        type="button"
        className={stepBtn}
        onClick={() => step(1)}
        aria-label={label ? `${b.increase} ${label}` : b.increase}
      >
        <Plus aria-hidden="true" strokeWidth={2} />
      </button>
    </div>
  );
}
