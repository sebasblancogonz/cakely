ALTER TYPE "public"."payment_status" ADD VALUE 'Parcial';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'Reembolsado';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "registration_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_history" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "images" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "instagram_handle" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "customer_name";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "customer_contact";--> statement-breakpoint
DROP TYPE "public"."status";