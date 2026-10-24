"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { normalizeDigits } from "@/lib/format";
import {
  confirmTwoFactorAction,
  enableTwoFactorAction,
  signOutOtherDevicesAction,
} from "../actions";

export function SignOutOthersButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="line"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await signOutOtherDevicesAction();
          if (!result.ok) return void toast.error(result.error);
          toast.success(`سُجّل الخروج من ${result.data.removed} جهاز`);
          router.refresh();
        })
      }
    >
      سجّل الخروج من الأجهزة الأخرى
    </Button>
  );
}

/** Password → otpauth URI + backup codes → confirm with the first code. */
export function TwoFactorSetup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!setup) {
    return (
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await enableTwoFactorAction(password);
            if (!result.ok) return setError(result.error);
            setError(null);
            setSetup(result.data);
          });
        }}
      >
        <Field
          id="tf-password"
          label="كلمة المرور للتأكيد"
          error={error ?? undefined}
          className="flex-1"
        >
          <Input
            id="tf-password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={pending || !password}>
          فعّل التحقق بخطوتين
        </Button>
      </form>
    );
  }

  const secret = new URL(setup.totpURI).searchParams.get("secret") ?? "";
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p>أضف هذا الحساب إلى تطبيق المصادقة بهذا المفتاح، أو افتح الرابط من هاتفك:</p>
      <code
        dir="ltr"
        className="rounded-input bg-surface block px-3 py-2 text-base tracking-widest"
      >
        {secret}
      </code>
      <a href={setup.totpURI} className="text-accent font-bold underline" dir="ltr">
        {setup.totpURI.slice(0, 48)}…
      </a>
      <div>
        <p className="font-bold">رموز احتياطية (احفظها في مكان آمن، يعمل كل رمز مرة واحدة):</p>
        <ul dir="ltr" className="mt-2 grid grid-cols-2 gap-1 font-mono sm:grid-cols-5">
          {setup.backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await confirmTwoFactorAction(code);
            if (!result.ok) return setError(result.error);
            toast.success("فُعّل التحقق بخطوتين");
            router.refresh();
          });
        }}
      >
        <Field id="tf-code" label="الرمز من التطبيق" error={error ?? undefined} className="flex-1">
          <Input
            id="tf-code"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, ""))}
          />
        </Field>
        <Button type="submit" disabled={pending || code.length !== 6}>
          تأكيد
        </Button>
      </form>
    </div>
  );
}
