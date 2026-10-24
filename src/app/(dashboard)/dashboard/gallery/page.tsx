import { GalleryBoard } from "@/components/admin/gallery/GalleryBoard.client";
import { requirePagePermission } from "@/lib/auth/session";
import { getGallery } from "@/modules/content";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Gallery (brief B11), from docs/design/Admin-Gallery.html. */
export default async function GalleryPage() {
  const staff = await requirePagePermission("gallery.manage");
  const data = await getGallery(staff);
  return <GalleryBoard data={data} />;
}
