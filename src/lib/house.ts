import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { closures, serviceHours, settings, zones } from "@/db/schema";

import { RESTAURANT_TIME_ZONE } from "./seasons";

/** The house itself, fictional like the rest of it. */
export const HOUSE = {
  street: "Vicolo dell'Aquila 7",
  district: "Oltrarno",
  city: "50125 Firenze",
  phone: "+39 055 000 1459",
  email: "tavola@auditore.example",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// The week as a Florentine reads it, from Monday.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export type Service = { name: "pranzo" | "cena"; opensAt: string; lastSeatingAt: string };
/** Consecutive weekdays that keep the same hours, e.g. "Tuesday – Sunday". */
export type HoursRow = { days: string; services: Service[] };

/** The weekly hours, runs of identical days folded together. Invalidate with updateTag("hours"). */
export async function getHours(): Promise<HoursRow[]> {
  "use cache";
  cacheTag("hours");
  cacheLife("days");

  const rows = await db.select().from(serviceHours).orderBy(asc(serviceHours.opensAt));
  const byDay = WEEK_ORDER.map((weekday) => ({
    weekday,
    services: rows
      .filter((row) => row.weekday === weekday)
      .map((row) => ({ name: row.service, opensAt: row.opensAt.slice(0, 5), lastSeatingAt: row.lastSeatingAt.slice(0, 5) })),
  }));

  const runs: { from: number; to: number; services: Service[] }[] = [];
  for (const day of byDay) {
    const last = runs.at(-1);
    if (last && JSON.stringify(last.services) === JSON.stringify(day.services)) last.to = day.weekday;
    else runs.push({ from: day.weekday, to: day.weekday, services: day.services });
  }
  return runs.map((run) => ({
    days: run.from === run.to ? WEEKDAYS[run.from] : `${WEEKDAYS[run.from]} – ${WEEKDAYS[run.to]}`,
    services: run.services,
  }));
}

export type TerraceStatus =
  | { open: true; closesOn: string; lastDays: boolean }
  | { open: false; reason: "season"; opensOn: string }
  | { open: false; reason: "today"; note: string | null };

/** Today's date on the restaurant's wall clock, as YYYY-MM-DD. */
function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: RESTAURANT_TIME_ZONE }).format(new Date());
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });

/** "04-15" in the year of `date` as "15 April". */
function spell(monthDay: string, year: string) {
  return dayMonth.format(new Date(`${year}-${monthDay}T00:00:00Z`));
}

/**
 * Whether the Terrazza is laid today: inside its season and not closed for
 * the day (rain). Re-read hourly so it turns over soon after midnight.
 */
export async function getTerraceStatus(): Promise<TerraceStatus> {
  "use cache";
  cacheTag("terrace");
  cacheLife("hours");

  const date = today();
  const [year, monthDay] = [date.slice(0, 4), date.slice(5)];
  const [config] = await db.select().from(settings).limit(1);
  const opens = config?.terraceOpensOn ?? "04-15";
  const closes = config?.terraceClosesOn ?? "10-31";

  if (monthDay < opens || monthDay > closes) {
    return { open: false, reason: "season", opensOn: spell(opens, year) };
  }

  const [closed] = await db
    .select({ reason: closures.reason })
    .from(closures)
    .innerJoin(zones, eq(closures.zoneId, zones.id))
    .where(and(eq(closures.date, date), eq(zones.slug, "terrazza")))
    .limit(1);
  if (closed) return { open: false, reason: "today", note: closed.reason };

  const daysLeft = (Date.parse(`${year}-${closes}`) - Date.parse(date)) / 86_400_000;
  return { open: true, closesOn: spell(closes, year), lastDays: daysLeft <= 14 };
}
