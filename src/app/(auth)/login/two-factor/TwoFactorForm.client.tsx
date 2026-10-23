"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Controls.client";
import { Field, Input, Label } from "@/components/ui/Input";
import { ar } from "@/i18n/ar";
import { normalizeDigits } from "@/lib/format";
import { verifyTwoFactorAction } from "../actions";
import { safeNext } from "../LoginForm.client";

export function TwoFactorForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await verifyTwoFactorAction({ code, trustDevice });
          if (!result.ok) return setError(result.error);
          router.push(next);
          router.refresh();
        });
      }}
    >
      <Field id="code" label={ar.auth.code} error={error ?? undefined}>
        <Input
          id="code"
          dir="ltr"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center text-2xl tracking-[0.5em]"
          value={code}
          aria-invalid={Boolean(error)}
          onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, ""))}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Checkbox
          id="trust"
          checked={trustDevice}
          onCheckedChange={(v) => setTrustDevice(v === true)}
        />
        <Label htmlFor="trust" className="font-medium">
          {ar.auth.trustDevice}
        </Label>
      </div>
      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
        {ar.auth.verify}
      </Button>
    </form>
  );
}
