/** Zod inputs for the content module's staff actions (brief A5). */
import { z } from "zod";

const id = z.string().uuid();

/** A photo the browser just uploaded to Blob under `gallery/`. */
export const galleryUploadSchema = z.object({
  url: z.url(),
  pathname: z.string().min(1).max(300),
});
export type GalleryUploadInput = z.input<typeof galleryUploadSchema>;

/** Caption, consent or publish state of one photo; omitted fields stay as they are. */
export const galleryUpdateSchema = z.object({
  id,
  caption: z.string().trim().max(200).optional(),
  consent: z.boolean().optional(),
  published: z.boolean().optional(),
});
export type GalleryUpdateInput = z.input<typeof galleryUpdateSchema>;

export const galleryDeleteSchema = z.object({ id });
export type GalleryDeleteInput = z.input<typeof galleryDeleteSchema>;
