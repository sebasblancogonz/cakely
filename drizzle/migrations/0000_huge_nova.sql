CREATE TYPE "public"."order_status" AS ENUM('Pendiente', 'Preparando', 'Listo', 'Entregado');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'Bizum');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('Pendiente', 'Pagado', 'Cancelado');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('Tarta', 'Galletas', 'Cupcakes', 'Macarons', 'Otros');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"labor_rate_hourly" numeric(10, 2) DEFAULT '15.00' NOT NULL,
	"profit_margin_percent" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"iva_percent" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"rent_monthly" numeric(10, 2) DEFAULT '0.00',
	"electricity_price_kwh" numeric(10, 4) DEFAULT '0.1500',
	"gas_price_unit" numeric(10, 4) DEFAULT '0.0600',
	"water_price_unit" numeric(10, 4) DEFAULT '2.0000',
	"other_monthly_overhead" numeric(10, 2) DEFAULT '50.00',
	"overhead_markup_percent" numeric(5, 2) DEFAULT '20.00',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"registration_date" timestamp NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ingredient_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"price_per_unit" numeric(10, 4) NOT NULL,
	"supplier" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_prices_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_contact" text NOT NULL,
	"order_date" timestamp NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"delivery_date" timestamp,
	"order_status" "order_status" NOT NULL,
	"product_type" "product_type" NOT NULL,
	"customization_details" text,
	"quantity" integer NOT NULL,
	"size_or_weight" text NOT NULL,
	"flavor" text NOT NULL,
	"allergy_information" text,
	"total_price" numeric(10, 2) NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"notes" text,
	"order_history" jsonb,
	"images" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_name_idx" ON "ingredient_prices" USING btree ("name");