import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Toggle chip. Pass `pressed` to make it a toggle button (aria-pressed). */
export function Chip({
  pressed,
  className,
  ...props
}: ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "rounded-pill ease-yz min-h-11 border px-5 text-[15px] font-bold transition-[background,box-shadow,border-color] duration-500",
        pressed
          ? "border-mint/60 from-teal-2 to-deep bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_16px_rgb(126_232_199/0.45)]"
          : "glass border-line text-accent hover:border-line-strong",
        className,
      )}
      {...props}
    />
  );
}
