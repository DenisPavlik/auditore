CREATE TABLE "volpe_visits" (
	"visitor" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "volpe_visits_visitor_day" ON "volpe_visits" USING btree ("visitor","day");