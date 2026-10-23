import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass rounded-card flex flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="rounded-card-sm bg-ok-bg text-accent flex size-16 items-center justify-center [&_svg]:size-7">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-extrabold">{title}</h2>
      {description ? (
        <p className="text-ink-muted max-w-md text-sm leading-7">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-input bg-off-bg animate-pulse", className)}
      {...props}
    />
  );
}

/** Initials avatar; first letters of the first two words. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-pill from-teal-2 to-deep inline-flex size-10 shrink-0 items-center justify-center bg-gradient-to-b text-sm font-extrabold text-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Pending business decision (brief B13): never invent the value, show it as pending. */
export function Pending({ children = "[للتأكيد]" }: { children?: ReactNode }) {
  return <span className="rounded-pill bg-warn-bg text-warn-ink px-2">{children}</span>;
}
