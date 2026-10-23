import { Suspense } from "react";
import { isCategoryKey } from "@/modules/catalog";
import { ar } from "@/i18n/ar";
import { blobUploadMode, RequestBuilder } from "@/modules/orders";

export const metadata = { title: ar.order.title };

/** Request builder (B5). `?category=mug` preselects the product (links from home/services). */
export default function OrderPage({ searchParams }: PageProps<"/order">) {
  return (
    <Suspense>
      <Builder searchParams={searchParams} />
    </Suspense>
  );
}

async function Builder({ searchParams }: Pick<PageProps<"/order">, "searchParams">) {
  const { category } = await searchParams;
  const value = typeof category === "string" ? category : null;
  return (
    <RequestBuilder
      initialCategory={value && isCategoryKey(value) ? value : null}
      uploadMode={blobUploadMode()}
    />
  );
}
