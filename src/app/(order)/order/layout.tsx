import { MarketingNav } from "@/components/layout/MarketingNav";
import { ar } from "@/i18n/ar";

/** Request builder layout (brief A7): dark hero band, then the step content + readiness panel. */
export default function OrderLayout({ children }: LayoutProps<"/order">) {
  return (
    <>
      <MarketingNav />
      <section className="bg-band pt-32 pb-24 text-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 sm:px-6">
          <h1 className="text-4xl leading-[56px] font-extrabold">{ar.order.title}</h1>
          <p className="max-w-2xl text-white/80">{ar.order.subtitle}</p>
        </div>
      </section>
      <main id="main" className="mx-auto -mt-16 w-full max-w-[1180px] flex-1 px-4 pb-20 sm:px-6">
        {children}
      </main>
    </>
  );
}
