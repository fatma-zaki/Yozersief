import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type Step = { key: string; label: string };

/**
 * Horizontal stepper (request builder, tracking stage rail). Steps before `current` are done.
 * `tone="dark"` for dark hero bands.
 */
export function Stepper({
  steps,
  current,
  tone = "auto",
  label,
}: {
  steps: readonly Step[];
  current: number;
  tone?: "auto" | "dark";
  label: string;
}) {
  return (
    <ol aria-label={label} className="flex w-full items-start gap-2">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={step.key}
            aria-current={state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "invisible" : i <= current ? "bg-mint" : "bg-line-strong",
                )}
              />
              <span
                className={cn(
                  "rounded-pill flex size-9 shrink-0 items-center justify-center border text-sm font-extrabold",
                  state === "done" && "border-mint/70 bg-teal-2 text-white",
                  state === "current" &&
                    "border-mint bg-deep text-mint shadow-[0_0_16px_rgb(126_232_199/0.5)]",
                  state === "todo" &&
                    (tone === "dark"
                      ? "border-white/30 text-white/60"
                      : "border-line-strong text-ink-soft"),
                )}
              >
                {state === "done" ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === steps.length - 1 ? "invisible" : i < current ? "bg-mint" : "bg-line-strong",
                )}
              />
            </div>
            <span
              className={cn(
                "text-xs leading-5 font-bold sm:text-[13px]",
                tone === "dark"
                  ? state === "todo"
                    ? "text-white/60"
                    : "text-white"
                  : state === "todo"
                    ? "text-ink-soft"
                    : "text-ink",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
