import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** ok = done (mint) · warn = needs the customer (gold) · role = staff role · off = neutral. */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill border px-3 py-0.5 text-[13px] leading-[22px] font-bold whitespace-nowrap",
  {
    variants: {
      tone: {
        ok: "border-mint/50 bg-ok-bg text-ok-ink",
        warn: "border-gold/50 bg-warn-bg text-warn-ink",
        role: "border-line-strong bg-panel text-accent",
        off: "border-transparent bg-off-bg text-off-ink",
        danger: "border-danger/30 bg-danger-bg text-danger",
      },
    },
    defaultVariants: { tone: "off" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
