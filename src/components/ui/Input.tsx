import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldBase = [
  "w-full rounded-input border bg-surface px-4 text-[15px] text-ink placeholder:text-ink-soft",
  "transition-[border-color,box-shadow] duration-300 ease-yz",
  "focus-visible:border-accent focus-visible:outline-none focus-visible:glow-ring",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-danger aria-invalid:bg-danger-bg",
].join(" ");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "border-line min-h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldBase, "border-line min-h-28 py-3 leading-7", className)}
      {...props}
    />
  );
}

/** Native select: accessible, RTL-correct, and works without JS. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(fieldBase, "border-line min-h-12 appearance-none pl-10", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-ink text-sm font-bold", className)} {...props} />;
}

/** Label + control + hint/error, wired with ids for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | undefined;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="text-ink-soft ms-1 font-medium">(اختياري)</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm font-bold">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-ink-muted text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
