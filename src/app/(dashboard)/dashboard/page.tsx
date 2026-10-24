import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import shell from "@/components/admin/shell/shell.module.css";
import { Card } from "@/components/ui/Card";
import { ar, t } from "@/i18n/ar";
import { requirePagePermission } from "@/lib/auth/session";
import { can, DASHBOARD_SECTIONS } from "@/lib/rbac";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/**
 * Dashboard home. The admin lands on «الطلبات» (the first screen of the admin designs); team
 * members get a card per workspace/section they can open.
 */
export default async function DashboardHome() {
  const staff = await requirePagePermission(null);
  if (staff.roleKey === "admin") redirect("/dashboard/orders");
  const sections = DASHBOARD_SECTIONS.filter(
    (s) => s.href !== "/dashboard" && (!s.permission || can(staff, s.permission)),
  );
  return (
    <div className={`${shell.gutter} flex flex-col gap-4`}>
      <PageHeader title={t(ar.dashboard.welcome, { name: staff.name })} subtitle="" />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block h-full">
              <Card className="ease-yz flex h-full items-center justify-between gap-3 transition-transform duration-500 hover:-translate-y-0.5">
                <span className="font-extrabold">{s.labelAr}</span>
                <ArrowLeft className="text-accent size-5" aria-hidden="true" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
