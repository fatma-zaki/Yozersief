import { Construction } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";
import { requirePagePermission } from "@/lib/auth/session";
import { DASHBOARD_SECTIONS, type DashboardSection } from "@/lib/rbac";

export function sectionByHref(href: DashboardSection["href"]): DashboardSection {
  const section = DASHBOARD_SECTIONS.find((s) => s.href === href);
  if (!section) throw new Error(`unknown dashboard section ${href}`);
  return section;
}

/**
 * Shared shell for dashboard sections: enforces the section's permission on the server,
 * then renders its title and content (an empty state until the section's phase lands).
 */
export async function SectionPage({
  href,
  description,
  children,
}: {
  href: DashboardSection["href"];
  description?: string;
  children?: ReactNode;
}) {
  const section = sectionByHref(href);
  await requirePagePermission(section.permission, {
    allowWithoutTwoFactor: href === "/dashboard/security",
  });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl leading-10 font-extrabold">{section.labelAr}</h1>
        {description ? <p className="text-ink-muted">{description}</p> : null}
      </div>
      {children ?? (
        <EmptyState
          icon={<Construction />}
          title={ar.dashboard.sectionEmpty}
          description={ar.dashboard.sectionEmptyBody}
        />
      )}
    </div>
  );
}
