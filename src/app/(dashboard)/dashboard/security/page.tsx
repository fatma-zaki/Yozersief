import { SectionPage } from "@/components/layout/dashboard/SectionPage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import { requireStaffPage } from "@/lib/auth/session";
import { listMySessions } from "@/modules/identity";
import { SignOutOthersButton, TwoFactorSetup } from "./SecurityControls.client";

/** My account security (A6.2): signed-in devices + optional 2FA. */
export default function SecurityPage() {
  return (
    <SectionPage href="/dashboard/security">
      <TwoFactorCard />
      <Sessions />
    </SectionPage>
  );
}

async function TwoFactorCard() {
  const staff = await requireStaffPage();
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>التحقق بخطوتين</CardTitle>
          <CardDescription>
            كود من تطبيق مصادقة زي Google Authenticator مع كلمة السر.
          </CardDescription>
        </div>
        <Badge tone={staff.twoFactorEnabled ? "ok" : "off"}>
          {staff.twoFactorEnabled ? "مفعّل" : "مش مفعّل"}
        </Badge>
      </div>
      {staff.twoFactorEnabled ? null : <TwoFactorSetup />}
    </Card>
  );
}

async function Sessions() {
  const staff = await requireStaffPage();
  const sessions = await listMySessions(staff);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>الأجهزة اللي داخل منها</CardTitle>
        {sessions.length > 1 ? <SignOutOthersButton /> : null}
      </div>
      <ul className="divide-line flex flex-col divide-y">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-bold">
                {s.deviceLabel}
                {s.city ? <span className="text-ink-muted font-medium"> — {s.city}</span> : null}
              </p>
              <p className="text-ink-muted text-xs">آخر ظهور: {formatDateTime(s.lastSeenAt)}</p>
            </div>
            {s.isCurrent ? <Badge tone="ok">الجهاز ده</Badge> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
