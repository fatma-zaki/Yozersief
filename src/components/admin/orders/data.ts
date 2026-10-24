import type { AdminOrderView } from "@/modules/orders";

/** An order as the screen receives it from `getAdminOrders` (brief B7). */
export type Order = AdminOrderView;
export type OrderStatus = Order["status"];
export type CustomerType = Order["ctype"];

/** Product photos from the design, by product, then by category. */
const PRODUCT_IMAGES: Record<string, string> = {
  tshirt: "/images/home/tshirt.jpg",
  hoodie: "/images/home/hoodie.jpg",
  sweat: "/images/home/hoodie.jpg",
  cap: "/images/home/cap.jpg",
  mug: "/images/home/mug-bottle.jpg",
  bottle: "/images/home/mug-bottle.jpg",
};
const CATEGORY_IMAGES: Record<string, string> = {
  wear: "/images/home/tshirt.jpg",
  mug: "/images/home/mug-bottle.jpg",
  phone: "/images/home/phone-cases.jpg",
  sticker: "/images/home/sticker.jpg",
  custom: "/images/home/shop-sign.jpg",
};

export function orderImage(o: Pick<Order, "productKey" | "categoryKey">): string {
  return (
    (o.productKey ? PRODUCT_IMAGES[o.productKey] : undefined) ??
    CATEGORY_IMAGES[o.categoryKey] ??
    "/images/home/shop-sign.jpg"
  );
}
