/**
 * Preloaded before every test (bunfig.toml). Next's server-only guards and cache calls become no-ops,
 * and "@/db" becomes an in-memory Postgres (PGlite) with the real migrations and the real house laid,
 * so the booking engine runs against the same exclusion constraint as production without touching it.
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { mock } from "bun:test";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/db/schema";
import { seedHouse } from "@/db/seed-data";

import { staff } from "./staff";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  updateTag: () => {},
  revalidateTag: () => {},
  refresh: () => {},
}));

const client = new PGlite({ extensions: { btree_gist } });
export const db = drizzle({ client, schema });
await migrate(db, { migrationsFolder: "drizzle" });
await seedHouse(db);

mock.module("@/db", () => ({ db }));

// Who is signed in to the admin, set by each test through tests/staff.ts.
mock.module("@/lib/auth", () => ({
  DEMO: { email: "ospite@auditore.it", password: "solo-guardare" },
  auth: {},
  getStaff: async () => staff.current,
  refuseUnlessOwner: async () => {
    if (!staff.current) return { ok: false, reason: "Sign in again, the session has ended." };
    if (staff.current.role !== "owner") return { ok: false, reason: "The demo can look around, but not write in the book." };
    return null;
  },
}));
