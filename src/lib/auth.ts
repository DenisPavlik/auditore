import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

import { db } from "@/db";
import * as schema from "@/db/schema";

/** Where the house's own site lives, for the links and checks Better Auth makes. */
const site =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3210");

/** The demo account anyone may open from the sign-in page; it can look but not change. */
export const DEMO = { email: "ospite@auditore.it", password: "solo-guardare" };

export const auth = betterAuth({
  baseURL: site,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Staff accounts are made by scripts/staff.ts, never from the web.
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: { type: ["owner", "demo"], required: false, defaultValue: "demo", input: false },
    },
  },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  // The Mac's address on the LAN, for trying the admin from a phone in dev.
  trustedOrigins: process.env.NODE_ENV === "development" ? ["http://192.168.*.*:3210"] : [],
  plugins: [nextCookies()],
});

export type Staff = { id: string; name: string; email: string; role: "owner" | "demo" };

/** Whoever is signed in to the admin, or null. */
export async function getStaff(): Promise<Staff | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role === "owner" ? "owner" : "demo" };
}

/** Only the owner writes in the book; the demo account is told so, kindly. Null means go ahead. */
export async function refuseUnlessOwner(): Promise<{ ok: false; reason: string } | null> {
  const staff = await getStaff();
  if (!staff) return { ok: false, reason: "Sign in again, the session has ended." };
  if (staff.role !== "owner") return { ok: false, reason: "The demo can look around, but not write in the book." };
  return null;
}
