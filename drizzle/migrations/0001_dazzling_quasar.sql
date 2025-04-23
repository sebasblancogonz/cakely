CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"product_type" varchar(100) NOT NULL,
	"base_labor_hours" numeric(10, 3) DEFAULT '0.5' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredient_prices_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient_prices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_name_idx" ON "recipes" USING btree ("name");