import { Suspense } from "react";
import { getPublicCatalog, isCategoryKey } from "@/modules/catalog";
import { ar } from "@/i18n/ar";
import { blobUploadMode, RequestBuilder } from "@/modules/orders";

export const metadata = { title: ar.order.title };

/**
 * Request builder (B5). The categories and product types come from the catalog (dashboard →
 * products). `?category=mug` preselects an offered category (links from home/services).
 */
export default function OrderPage({ searchParams }: PageProps<"/order">) {
  return (
    <Suspense>
      <Builder searchParams={searchParams} />
    </Suspense>
  );
}

async function Builder({ searchParams }: Pick<PageProps<"/order">, "searchParams">) {
  const [{ category }, categories] = await Promise.all([searchParams, getPublicCatalog()]);
  const value = typeof category === "string" ? category : null;
  const offered = value && isCategoryKey(value) && categories.some((c) => c.key === value);
  return (
    <RequestBuilder
      initialCategory={offered ? value : null}
      uploadMode={blobUploadMode()}
      categories={categories}
    />
  );
}
