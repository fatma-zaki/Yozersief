import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Frosted glass card. `tone="dark"` is for content placed on dark teal bands. */
export function Card({
  className,
  tone = "auto",
  ...props
}: ComponentProps<"div"> & { tone?: "auto" | "dark" }) {
  return (
    <div
      className={cn(
        "rounded-card p-6",
        tone === "dark" ? "glass-dark text-white" : "glass",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-lg leading-8 font-extrabold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-ink-muted text-sm leading-6", className)} {...props} />;
}
