ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "unq_product_center" UNIQUE("product_id","fulfillment_center_id");