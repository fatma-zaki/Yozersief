import { GalleryBoard } from "@/components/admin/gallery/GalleryBoard.client";
import { requirePagePermission } from "@/lib/auth/session";

/** Gallery (brief B11), from docs/design/Admin-Gallery.html. */
export default async function GalleryPage() {
  await requirePagePermission("gallery.manage");
  return <GalleryBoard />;
}
