/**
 * Makes (or resets) the two staff accounts of the admin:
 * the owner from OWNER_EMAIL / OWNER_PASSWORD in .env.development.local, and the read-only demo.
 *
 *   bun scripts/staff.ts
 */
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as s from "../src/db/schema";

loadEnvConfig(process.cwd());

const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema: s });

// Kept in step with DEMO in src/lib/auth.ts, which cannot be imported outside Next.
const staff = [
  { name: "Il Maître", email: process.env.OWNER_EMAIL!, password: process.env.OWNER_PASSWORD!, role: "owner" as const },
  { name: "Ospite", email: "ospite@auditore.it", password: "solo-guardare", role: "demo" as const },
];

for (const person of staff) {
  if (!person.email || !person.password) throw new Error(`Missing email or password for the ${person.role}.`);
  const [found] = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.email, person.email));
  const id = found?.id ?? crypto.randomUUID();
  if (!found) await db.insert(s.user).values({ id, name: person.name, email: person.email, emailVerified: true, role: person.role });
  else await db.update(s.user).set({ name: person.name, role: person.role }).where(eq(s.user.id, id));

  const password = await hashPassword(person.password);
  await db.delete(s.account).where(eq(s.account.userId, id));
  await db.insert(s.account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password });
  console.log(`${person.role}: ${person.email}`);
}
