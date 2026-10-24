import { Suspense } from "react";
import { PENDING_DECISIONS } from "@/components/admin/team/data";
import {
  BottomNav,
  ShellFrame,
  SidebarContent,
  SidebarFrame,
  SidebarSkeleton,
} from "@/components/admin/shell/AdminShell";

export const metadata = { robots: { index: false } };

/**
 * Staff area, from the admin designs (docs/design/Admin*.html): the dark floating sidebar and a
 * main column where each screen renders its own glass header. The frame is a static shell;
 * everything that reads the session streams in behind Suspense (Cache Components).
 * The proxy gate is optimistic; each page re-checks session and permission on the server.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <ShellFrame
      sidebar={
        <SidebarFrame>
          <Suspense fallback={<SidebarSkeleton />}>
            <SidebarContent
              counts={{
                "/dashboard/team": PENDING_DECISIONS,
              }}
            />
          </Suspense>
        </SidebarFrame>
      }
      bottomNav={
        <Suspense>
          <BottomNav />
        </Suspense>
      }
    >
      <main id="main" style={{ display: "contents" }}>
        <Suspense>{children}</Suspense>
      </main>
    </ShellFrame>
  );
}
