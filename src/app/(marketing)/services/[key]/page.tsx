import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ar } from "@/i18n/ar";
import { CATEGORY_KEYS, isCategoryKey } from "@/modules/catalog";

export function generateStaticParams() {
  return CATEGORY_KEYS.map((key) => ({ key }));
}

export async function generateMetadata({ params }: PageProps<"/services/[key]">) {
  const { key } = await params;
  return isCategoryKey(key) ? { title: ar.catalog[key].t } : {};
}

/** Service page (B10). Phase 0 skeleton: category intro + CTA; details come with Phase 5 catalog admin. */
export default async function ServicePage({ params }: PageProps<"/services/[key]">) {
  const { key } = await params;
  if (!isCategoryKey(key)) notFound();
  const category = ar.catalog[key];

  return (
    <>
      <section className="bg-band pt-36 pb-16 text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 sm:px-6">
          <h1 className="text-4xl leading-[56px] font-extrabold">{category.t}</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/80">{category.d}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-14 sm:px-6 md:grid-cols-2">
        <div className="rounded-card relative aspect-[4/3] overflow-hidden">
          <Image
            src={`/images/categories/${key}.jpg`}
            alt={category.t}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <Card className="flex flex-col items-start justify-center gap-4">
          <p className="text-ink-muted leading-8">{ar.order.subtitle}</p>
          <Button asChild size="lg">
            <Link href={`/order?category=${key}`}>{ar.nav.startOrderNow}</Link>
          </Button>
        </Card>
      </div>
    </>
  );
}
