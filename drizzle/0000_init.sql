CREATE TYPE "public"."booking_source" AS ENUM('web', 'phone', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'seated', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."season" AS ENUM('autumn', 'winter', 'spring', 'summer');--> statement-breakpoint
CREATE TYPE "public"."service" AS ENUM('pranzo', 'cena');--> statement-breakpoint
CREATE TYPE "public"."table_shape" AS ENUM('round', 'square', 'rect', 'booth');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"party_size" smallint NOT NULL,
	"guest_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"notes" text,
	"occasion" text,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"source" "booking_source" DEFAULT 'web' NOT NULL,
	"manage_token" text DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_manage_token_unique" UNIQUE("manage_token"),
	CONSTRAINT "time_order" CHECK ("bookings"."ends_at" > "bookings"."starts_at"),
	CONSTRAINT "party_size_positive" CHECK ("bookings"."party_size" >= 1)
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"zone_id" integer,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "dining_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"zone_id" integer NOT NULL,
	"min_guests" smallint NOT NULL,
	"max_guests" smallint NOT NULL,
	"shape" "table_shape" NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"width" real NOT NULL,
	"height" real NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "dining_tables_label_unique" UNIQUE("label"),
	CONSTRAINT "guests_range" CHECK ("dining_tables"."min_guests" >= 1 and "dining_tables"."max_guests" >= "dining_tables"."min_guests")
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"season" "season",
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"subtitle" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"season" "season",
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"illustration" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" smallint NOT NULL,
	"service" "service" NOT NULL,
	"opens_at" time NOT NULL,
	"last_seating_at" time NOT NULL,
	CONSTRAINT "weekday_range" CHECK ("service_hours"."weekday" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"terrace_opens_on" text DEFAULT '04-15' NOT NULL,
	"terrace_closes_on" text DEFAULT '10-31' NOT NULL,
	"seating_minutes" smallint DEFAULT 120 NOT NULL,
	"slot_interval_minutes" smallint DEFAULT 15 NOT NULL,
	CONSTRAINT "singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_seasonal" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "zones_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_id_dining_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."dining_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_starts_at" ON "bookings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "closures_date" ON "closures" USING btree ("date");--> statement-breakpoint
CREATE INDEX "menu_items_category" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_hours_weekday_service" ON "service_hours" USING btree ("weekday","service");