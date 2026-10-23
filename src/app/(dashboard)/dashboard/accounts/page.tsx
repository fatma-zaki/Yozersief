import { SectionPage } from "@/components/layout/dashboard/SectionPage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { Table, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { ROLES } from "@/lib/rbac";
import { listMembers } from "@/modules/identity";
import { InviteForm } from "./InviteForm.client";

const STATUS = {
  active: { label: "نشط", tone: "ok" },
  pending: { label: "مستني التفعيل", tone: "warn" },
  paused: { label: "موقوف", tone: "off" },
} as const;

/** Accounts & permissions (B10). Phase 0: invite + member list; the matrix editor is Phase 5. */
export default function AccountsPage() {
  return (
    <SectionPage href="/dashboard/accounts">
      <Card className="flex flex-col gap-4">
        <CardTitle>دعوة عضو جديد</CardTitle>
        <InviteForm roles={ROLES.filter((r) => r.key !== "admin")} />
      </Card>
      <Members />
    </SectionPage>
  );
}

async function Members() {
  const staff = await requireStaffPage();
  const members = await listMembers(staff);
  return (
    <Table label="أعضاء الفريق" columns="2fr 1.2fr 1.4fr 1fr">
      <TableHeader>
        <TableCell header>الاسم</TableCell>
        <TableCell header>الدور</TableCell>
        <TableCell header>الموبايل</TableCell>
        <TableCell header>الحالة</TableCell>
      </TableHeader>
      {members.map((m) => (
        <TableRow key={m.id}>
          <TableCell label="الاسم">
            <span className="font-bold">{m.name}</span>
            {m.email ? (
              <span className="text-ink-muted block text-xs" dir="ltr">
                {m.email}
              </span>
            ) : null}
          </TableCell>
          <TableCell label="الدور">
            <Badge tone="role">{m.roleNameAr}</Badge>
          </TableCell>
          <TableCell label="الموبايل">
            <bdi dir="ltr">{m.phone}</bdi>
          </TableCell>
          <TableCell label="الحالة">
            <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
