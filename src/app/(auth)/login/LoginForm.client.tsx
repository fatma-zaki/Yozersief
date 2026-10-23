"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ar } from "@/i18n/ar";
import { loginSchema, type LoginInput } from "@/modules/identity/schemas";
import { signInAction } from "./actions";

/** Only same-site paths are accepted for ?next=, to avoid open redirects. */
export function safeNext(value: string | null): string {
  return value && value.startsWith("/dashboard") && !value.startsWith("//") ? value : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signInAction(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    router.push(
      result.data.twoFactor ? `/login/two-factor?next=${encodeURIComponent(next)}` : next,
    );
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field id="identifier" label={ar.auth.identifier} error={errors.identifier?.message}>
        <Input
          id="identifier"
          dir="ltr"
          autoComplete="username"
          inputMode="email"
          aria-invalid={Boolean(errors.identifier)}
          {...register("identifier")}
        />
      </Field>
      <Field id="password" label={ar.auth.password} error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>
      {formError ? (
        <p
          role="alert"
          className="rounded-input bg-danger-bg text-danger px-4 py-3 text-sm font-bold"
        >
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? ar.auth.signingIn : ar.auth.signIn}
      </Button>
    </form>
  );
}
