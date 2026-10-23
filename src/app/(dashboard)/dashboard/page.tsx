import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ar, t } from "@/i18n/ar";
import { requirePagePermission } from "@/lib/auth/session";
import { can, DASHBOARD_SECTIONS } from "@/lib/rbac";

/** Dashboard home: a card per workspace/section the member can open. */
export default async function DashboardHome() {
  const staff = await requirePagePermission(null);
  const sections = DASHBOARD_SECTIONS.filter(
    (s) => s.href !== "/dashboard" && (!s.permission || can(staff, s.permission)),
  );
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl leading-10 font-extrabold">
        {t(ar.dashboard.welcome, { name: staff.name })}
      </h1>
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
