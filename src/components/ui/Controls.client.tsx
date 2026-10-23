"use client";

import { Check } from "lucide-react";
import {
  Checkbox as CheckboxPrimitive,
  Switch as SwitchPrimitive,
  Tabs as TabsPrimitive,
} from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "rounded-pill border-line-strong bg-off-bg relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border transition-colors duration-300",
        "data-[state=checked]:border-mint/70 data-[state=checked]:bg-teal-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* RTL: the thumb starts on the right and moves left when checked. */}
      <SwitchPrimitive.Thumb className="rounded-pill ease-yz block size-5 translate-x-[-3px] bg-white shadow transition-transform duration-300 data-[state=checked]:translate-x-[-23px] ltr:translate-x-[3px] ltr:data-[state=checked]:translate-x-[23px]" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "border-line-strong bg-surface flex size-6 shrink-0 items-center justify-center rounded-[8px] border",
        "data-[state=checked]:border-mint/70 data-[state=checked]:bg-teal-2 data-[state=checked]:text-white",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-4" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("glass rounded-pill inline-flex gap-1 p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-pill text-ink-muted min-h-10 px-5 text-sm font-bold transition-colors duration-300",
        "data-[state=active]:from-teal-2 data-[state=active]:to-deep data-[state=active]:bg-gradient-to-b data-[state=active]:text-white",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-6 outline-none", className)} {...props} />;
}
