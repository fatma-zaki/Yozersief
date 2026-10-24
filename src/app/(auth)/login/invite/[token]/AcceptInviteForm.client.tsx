"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ar } from "@/i18n/ar";
import { acceptInvitationSchema, type AcceptInvitationInput } from "@/modules/identity/schemas";
import { acceptInvitationAction } from "../../actions";

export function AcceptInviteForm({
  token,
  contact,
  contactKind,
}: {
  token: string;
  contact: string;
  contactKind: "phone" | "email";
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await acceptInvitationAction(values);
    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof AcceptInvitationInput, { message: messages[0] });
      }
      setFormError(result.error);
      return;
    }
    router.push(result.data.signedIn ? "/dashboard" : "/login");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <input type="hidden" {...register("token")} />
      <p className="rounded-input bg-ok-bg px-4 py-3 text-sm">
        الدعوة لـ{" "}
        <bdi dir="ltr" className="font-bold">
          {contact}
        </bdi>
      </p>
      <Field id="name" label={ar.auth.name} error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>
      {contactKind === "email" ? (
        <Field id="phone" label="رقم الهاتف" error={errors.phone?.message}>
          <Input
            id="phone"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </Field>
      ) : (
        <Field id="email" label="البريد الإلكتروني" optional error={errors.email?.message}>
          <Input
            id="email"
            dir="ltr"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>
      )}
      <Field id="password" label={ar.auth.password} error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>
      <Field
        id="confirmPassword"
        label={ar.auth.confirmPassword}
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
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
        {ar.auth.activate}
      </Button>
    </form>
  );
}
