"use client";

import { Eye, EyeOff } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ar } from "@/i18n/ar";
import { cn } from "@/lib/cn";

/**
 * Password-masked field with an independent show/hide control.
 * Values stay in a real `type="password"` input until the customer opts in
 * (no CSS-only masking that leaves plaintext in the DOM).
 */
export function SecretField({
  id,
  label,
  visible,
  onToggleVisible,
  error,
  className,
  ...inputProps
}: {
  id: string;
  label: string;
  visible: boolean;
  onToggleVisible: () => void;
  error?: string | undefined;
} & Omit<ComponentProps<"input">, "id" | "type">) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          className={cn("pe-14", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-1 top-1/2 -translate-y-1/2"
          onClick={onToggleVisible}
          aria-pressed={visible}
          aria-label={visible ? ar.tracking.hideValue : ar.tracking.showValue}
          aria-controls={id}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      </div>
    </Field>
  );
}
