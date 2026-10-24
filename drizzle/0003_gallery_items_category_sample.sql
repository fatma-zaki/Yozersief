ALTER TABLE "gallery_items" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_storage_key_unique" UNIQUE("storage_key");