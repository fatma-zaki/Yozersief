import { MarketingNav } from "@/components/layout/MarketingNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MarketingNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
