"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ar } from "@/i18n/ar";
import { SecretField } from "@/components/ui/SecretField";
import { trackingLookupSchema, type TrackingLookupRaw } from "@/modules/tracking/schemas";
import { verifyTrackingAction } from "./actions";

/**
 * Success-path side effects after verify: clear credentials, hide values, go to `/track/[ref]`.
 * Exported so unit tests exercise the same path the form uses (no parallel stub).
 */
export function applyTrackingVerifySuccess(
  ref: string,
  helpers: {
    reset: (values: TrackingLookupRaw) => void;
    setShowRef: (visible: boolean) => void;
    setShowPhone: (visible: boolean) => void;
    push: (href: string) => void;
    refresh: () => void;
  },
): void {
  helpers.reset({ ref: "", phone: "" });
  helpers.setShowRef(false);
  helpers.setShowPhone(false);
  helpers.push(`/track/${ref}`);
  helpers.refresh();
}

/**
 * Manual tracking entry: ref + registered phone → signed session → `/track/[ref]`.
 * Credentials never go in the URL, storage, or analytics.
 */
export function TrackForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkBad = searchParams.get("link") === "invalid";
  const [formError, setFormError] = useState<string | null>(null);
  const [showRef, setShowRef] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackingLookupRaw>({
    resolver: zodResolver(trackingLookupSchema),
    defaultValues: { ref: "", phone: "" },
  });

  const busy = isSubmitting || pending;

  const onSubmit = handleSubmit((values) => {
    if (busy) return;
    setFormError(null);
    startTransition(async () => {
      const result = await verifyTrackingAction(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      applyTrackingVerifySuccess(result.data.ref, {
        reset,
        setShowRef,
        setShowPhone,
        push: (href) => router.push(href),
        refresh: () => router.refresh(),
      });
    });
  });

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <CardTitle>{ar.tracking.title}</CardTitle>
        <CardDescription>{ar.tracking.subtitle}</CardDescription>
      </div>
      {linkBad ? (
        <p
          role="status"
          className="rounded-input border-gold/50 bg-warn-bg text-warn-ink border px-4 py-3 text-sm font-bold"
        >
          {ar.tracking.badLink}
        </p>
      ) : null}
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
        autoComplete="off"
        data-testid="track-form"
      >
        <SecretField
          id="track-ref"
          label={ar.tracking.refLabel}
          visible={showRef}
          onToggleVisible={() => setShowRef((v) => !v)}
          dir="ltr"
          placeholder="YZ-XXXXXX"
          inputMode="text"
          autoCapitalize="characters"
          disabled={busy}
          error={errors.ref?.message}
          {...register("ref")}
        />
        <SecretField
          id="track-phone"
          label={ar.tracking.phoneLabel}
          visible={showPhone}
          onToggleVisible={() => setShowPhone((v) => !v)}
          dir="ltr"
          placeholder="01xxxxxxxxx"
          inputMode="tel"
          disabled={busy}
          error={errors.phone?.message}
          {...register("phone")}
        />
        {formError ? (
          <p
            role="alert"
            className="rounded-input bg-danger-bg text-danger px-4 py-3 text-sm font-bold"
          >
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={busy} aria-busy={busy}>
          {busy ? ar.tracking.submitting : ar.tracking.submit}
        </Button>
      </form>
    </Card>
  );
}
