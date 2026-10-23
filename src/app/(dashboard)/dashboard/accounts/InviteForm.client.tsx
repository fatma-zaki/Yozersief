"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/format";
import { normalizeEgyptianMobile, toInternational } from "@/lib/phone";
import type { RoleKey } from "@/lib/rbac/permissions";
import { inviteStaffAction } from "../actions";

export function InviteForm({ roles }: { roles: readonly { key: RoleKey; nameAr: string }[] }) {
  const [contact, setContact] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>(roles[0]?.key ?? "desk");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{
    url: string;
    expiresAt: string;
    phone: string | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteStaffAction({ contact, roleKey });
      if (!result.ok) {
        setError(result.fieldErrors?.contact?.[0] ?? result.error);
        return;
      }
      setInvite({
        url: result.data.inviteUrl,
        expiresAt: result.data.expiresAt,
        phone: normalizeEgyptianMobile(contact),
      });
      setContact("");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end"
      >
        <Field id="contact" label="الموبايل أو الإيميل" error={error ?? undefined}>
          <Input
            id="contact"
            dir="ltr"
            value={contact}
            aria-invalid={Boolean(error)}
            onChange={(e) => setContact(e.target.value)}
          />
        </Field>
        <Field id="role" label="الدور">
          <Select id="role" value={roleKey} onChange={(e) => setRoleKey(e.target.value as RoleKey)}>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.nameAr}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={pending || !contact.trim()}>
          ابعت دعوة
        </Button>
      </form>

      {invite ? (
        <div role="status" className="rounded-input bg-ok-bg flex flex-col gap-3 p-4 text-sm">
          <p className="font-bold">
            اللينك جاهز. ابعته للعضو — بيشتغل مرة واحدة لحد{" "}
            {formatDateTime(new Date(invite.expiresAt))}{" "}
            <span className="text-warn-ink">[المدة للتأكيد]</span>.
          </p>
          <code
            dir="ltr"
            className="rounded-input bg-surface block overflow-x-auto px-3 py-2 text-xs"
          >
            {invite.url}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="soft"
              onClick={() => {
                void navigator.clipboard.writeText(invite.url);
                toast.success("اتنسخ اللينك");
              }}
            >
              <Copy aria-hidden="true" /> نسخ اللينك
            </Button>
            {invite.phone ? (
              <Button size="sm" variant="soft" asChild>
                <a
                  href={`https://wa.me/${toInternational(invite.phone)}?text=${encodeURIComponent(
                    `أهلًا! دي دعوتك لفريق يوزرسيف. افتح اللينك واختار كلمة سر: ${invite.url}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" /> ابعت على واتساب
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
