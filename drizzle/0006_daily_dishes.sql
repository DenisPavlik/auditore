CREATE TABLE "daily_dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "daily_dishes_date" ON "daily_dishes" USING btree ("date");