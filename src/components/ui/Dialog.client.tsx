"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlay = "fixed inset-0 z-50 bg-deep-2/50 backdrop-blur-sm";

/** Centered dialog on desktop. Use <SheetContent> for the mobile bottom sheet. */
export function DialogContent({
  title,
  description,
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { title: ReactNode; description?: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        className={cn(
          "glass rounded-card bg-surface text-ink fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 p-6",
          className,
        )}
        {...props}
      >
        <DialogHeader title={title} description={description} />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Mobile bottom sheet (brief A7 "Sheet (mobile)"). */
export function SheetContent({
  title,
  description,
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { title: ReactNode; description?: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        className={cn(
          "glass rounded-t-card bg-surface text-ink fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          className,
        )}
        {...props}
      >
        <div aria-hidden="true" className="rounded-pill bg-line-strong mx-auto mb-4 h-1.5 w-12" />
        <DialogHeader title={title} description={description} />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <DialogPrimitive.Title className="text-lg font-extrabold">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="text-ink-muted mt-1 text-sm leading-6">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
      </div>
      <DialogPrimitive.Close
        aria-label="إغلاق"
        className="rounded-pill text-ink-muted hover:bg-off-bg flex size-11 shrink-0 items-center justify-center"
      >
        <X className="size-5" />
      </DialogPrimitive.Close>
    </div>
  );
}
