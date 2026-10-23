import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * cta: primary gradient + mint border + glow. soft: tinted mint. ghost: transparent.
 * line: outlined. All variants keep a 44px minimum touch target.
 */
export const buttonVariants = cva(
  [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-6 text-[15px] font-bold",
    "transition-[background,box-shadow,transform,color,border-color] duration-500 ease-yz",
    "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        cta: "cta hover:-translate-y-0.5 hover:glow-ring",
        soft: "border border-line bg-ok-bg text-accent hover:border-line-strong",
        ghost: "text-accent hover:bg-off-bg",
        line: "border border-line-strong bg-transparent text-accent hover:bg-off-bg",
        danger: "border border-danger/40 bg-danger-bg text-danger hover:border-danger",
      },
      size: {
        md: "",
        sm: "min-h-9 px-4 text-sm",
        lg: "min-h-13 px-8 text-base",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: { variant: "cta", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
