/**
 * Seeds reference data: zones, floor plan, service hours, settings, menu.
 * Refuses to run while bookings exist unless called with --force,
 * because re-seeding tables cascades into bookings.
 *
 *   bun run db:seed [--force]
 */
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as s from "../src/db/schema";
import { menu, seedHouse, serviceHours, tables } from "../src/db/seed-data";

loadEnvConfig(process.cwd());

const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema: s });

async function main() {
  const force = process.argv.includes("--force");
  const [{ value: bookingCount }] = await db.select({ value: count() }).from(s.bookings);
  if (bookingCount > 0 && !force) {
    console.error(`Refusing to seed: ${bookingCount} bookings exist. Re-run with --force to wipe them.`);
    process.exit(1);
  }

  await db.execute(sql`
    truncate table bookings, closures, dining_tables, zones, service_hours,
      settings, menu_items, menu_categories restart identity cascade
  `);

  const laid = await seedHouse(db);
  console.log(
    `Seeded ${laid.zones} zones, ${tables.length} tables, ${serviceHours.length} service windows, ` +
      `${laid.categories} categories, ${Object.values(menu).flat().length} menu items.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
