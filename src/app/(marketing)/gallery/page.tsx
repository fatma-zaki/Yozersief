import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";

export const metadata = { title: ar.nav.gallery };

/** Gallery (B10, B11). Only consented items are ever published; empty until then. */
export default function GalleryPage() {
  return (
    <>
      <section className="bg-band pt-36 pb-16 text-white">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <h1 className="text-4xl leading-[56px] font-extrabold">{ar.home.galleryTitle}</h1>
        </div>
      </section>
      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6">
        <EmptyState icon={<ImageIcon />} title={ar.home.galleryEmpty} />
      </div>
    </>
  );
}
