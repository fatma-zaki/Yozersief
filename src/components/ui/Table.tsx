import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Div-grid responsive table: a real grid on wide screens, stacked cards on phones.
 * `columns` is a CSS grid-template-columns value shared by the header and every row.
 */
export function Table({
  columns,
  className,
  children,
  label,
}: {
  columns: string;
  className?: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      role="table"
      aria-label={label}
      className={cn("glass rounded-card overflow-hidden", className)}
      style={{ "--cols": columns } as CSSProperties}
    >
      {children}
    </div>
  );
}

const rowGrid = "md:grid md:grid-cols-[var(--cols)] md:items-center md:gap-4";

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <div
      role="row"
      className={cn(
        "border-line text-ink-muted hidden border-b px-6 py-3 text-[13px] font-bold",
        rowGrid,
      )}
    >
      {children}
    </div>
  );
}

export function TableRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="row"
      className={cn(
        "border-line hover:bg-off-bg flex flex-col gap-2 border-b px-6 py-4 last:border-b-0",
        rowGrid,
        className,
      )}
      {...props}
    />
  );
}

/** `label` is shown before the value on phones, where there is no header row. */
export function TableCell({
  label,
  className,
  children,
  header,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
  header?: boolean;
}) {
  return (
    <div role={header ? "columnheader" : "cell"} className={cn("min-w-0 text-sm", className)}>
      {label && !header ? (
        <span className="text-ink-soft me-2 font-bold md:hidden">{label}:</span>
      ) : null}
      {children}
    </div>
  );
}
