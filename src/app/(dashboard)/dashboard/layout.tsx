import { Suspense } from "react";
import {
  DashboardBottomNav,
  DashboardSidebar,
  DashboardUser,
  HeaderFrame,
  NavSkeleton,
  SidebarFrame,
} from "@/components/layout/dashboard/DashboardChrome";
import { Skeleton } from "@/components/ui/Feedback";

export const metadata = { robots: { index: false } };

/**
 * Staff area (brief A7): dark floating sidebar + glass header. The chrome is a static shell;
 * everything that reads the session streams in behind Suspense (Cache Components).
 * The proxy gate is optimistic; each page re-checks session and permission on the server.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh gap-4 p-4 pb-24 lg:pb-4">
      <SidebarFrame>
        <Suspense fallback={<NavSkeleton />}>
          <DashboardSidebar />
        </Suspense>
      </SidebarFrame>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <HeaderFrame>
          <Suspense fallback={<Skeleton className="rounded-pill size-10" />}>
            <DashboardUser />
          </Suspense>
        </HeaderFrame>
        <main id="main" className="flex-1">
          <Suspense fallback={<Skeleton className="rounded-card h-64" />}>{children}</Suspense>
        </main>
      </div>
      <Suspense>
        <DashboardBottomNav />
      </Suspense>
    </div>
  );
}
