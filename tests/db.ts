import { sql } from "drizzle-orm";

import { db } from "./setup";

export { db };

/** Clears what tests write, keeping the house laid by the seed. */
export async function clearBook() {
  await db.execute(sql`truncate table bookings, closures, daily_dishes restart identity`);
  await db.execute(sql`update settings set terrace_opens_on = '04-15', terrace_closes_on = '10-31' where id = 1`);
}
