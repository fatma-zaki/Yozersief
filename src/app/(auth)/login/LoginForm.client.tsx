"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/i18n/ar";
import { loginSchema, type LoginInput } from "@/modules/identity/schemas";
import { signInAction } from "./actions";
import s from "./login.module.css";

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
    <form onSubmit={onSubmit} noValidate className={s.form}>
      <div className={s.field}>
        <label htmlFor="identifier" className="sr-only">
          {ar.auth.identifier}
        </label>
        <input
          id="identifier"
          className={s.input}
          dir="ltr"
          autoComplete="username"
          inputMode="email"
          placeholder={ar.auth.identifier}
          aria-invalid={Boolean(errors.identifier)}
          {...register("identifier")}
        />
        {errors.identifier?.message ? (
          <p id="identifier-error" role="alert" className={s.error}>
            {errors.identifier.message}
          </p>
        ) : null}
      </div>
      <div className={s.field}>
        <label htmlFor="password" className="sr-only">
          {ar.auth.password}
        </label>
        <input
          id="password"
          className={s.input}
          type="password"
          dir="ltr"
          autoComplete="current-password"
          placeholder={ar.auth.password}
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password?.message ? (
          <p id="password-error" role="alert" className={s.error}>
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {formError ? (
        <p role="alert" className={s.alert}>
          {formError}
        </p>
      ) : null}
      <button type="submit" className={s.submit} disabled={isSubmitting}>
        {isSubmitting ? ar.auth.signingIn : ar.auth.signIn}
      </button>
    </form>
  );
}
