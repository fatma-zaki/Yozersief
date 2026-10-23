CREATE TABLE "upload_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_key_hash" text NOT NULL,
	"kind" "file_kind" NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_drafts_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "upload_drafts_kind_customer" CHECK ("upload_drafts"."kind" IN ('design', 'reference', 'names_sheet'))
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key_hash" text;--> statement-breakpoint
CREATE INDEX "upload_drafts_submission_key_hash_idx" ON "upload_drafts" USING btree ("submission_key_hash");--> statement-breakpoint
CREATE INDEX "upload_drafts_expires_at_idx" ON "upload_drafts" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_idempotency_key_hash_unique" UNIQUE("idempotency_key_hash");