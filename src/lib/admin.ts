import "server-only";

import { and, asc, eq, gte, lt } from "drizzle-orm";

import { db } from "@/db";
import { bookings, closures, diningTables, serviceHours, settings, zones } from "@/db/schema";

import { addDays, florenceInstant, florenceNow, florenceWallClock, weekdayOf, type ZoneSlug } from "./booking";

export type BookingStatus = (typeof bookings.$inferSelect)["status"];
export type BookingSource = (typeof bookings.$inferSelect)["source"];

/** A booking as the maître sees it on the timeline, times on the Florence wall clock. */
export type BookEntry = {
  id: string;
  table: string;
  start: string;
  end: string;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  occasion: string | null;
  status: BookingStatus;
  source: BookingSource;
  bookedOn: string;
};

export type BookTable = { label: string; zone: ZoneSlug; minGuests: number; maxGuests: number };

export type Service = { service: "pranzo" | "cena"; opensAt: string; lastSeatingAt: string };

/** Everything the timeline needs for one day of the house. */
export type DayBook = {
  date: string;
  weekday: string;
  today: string;
  now: string;
  services: Service[];
  seatingMinutes: number;
  tables: BookTable[];
  closedZones: ZoneSlug[];
  closedReason: string | null;
  terraceSeason: boolean;
  bookings: BookEntry[];
};

export async function getDayBook(date: string): Promise<DayBook> {
  const from = florenceInstant(date, "00:00");
  const to = florenceInstant(addDays(date, 1), "00:00");
  const [hours, [config], dayClosures, tables, rows] = await Promise.all([
    db
      .select({ service: serviceHours.service, opensAt: serviceHours.opensAt, lastSeatingAt: serviceHours.lastSeatingAt })
      .from(serviceHours)
      .where(eq(serviceHours.weekday, new Date(`${date}T12:00:00Z`).getUTCDay()))
      .orderBy(asc(serviceHours.opensAt)),
    db.select().from(settings).limit(1),
    db.select({ zone: zones.slug, reason: closures.reason }).from(closures).leftJoin(zones, eq(closures.zoneId, zones.id)).where(eq(closures.date, date)),
    db
      .select({ label: diningTables.label, zone: zones.slug, minGuests: diningTables.minGuests, maxGuests: diningTables.maxGuests })
      .from(diningTables)
      .innerJoin(zones, eq(diningTables.zoneId, zones.id))
      .where(eq(diningTables.isActive, true))
      .orderBy(asc(zones.sortOrder), asc(diningTables.label)),
    db
      .select({
        id: bookings.id,
        table: diningTables.label,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        partySize: bookings.partySize,
        name: bookings.guestName,
        email: bookings.email,
        phone: bookings.phone,
        notes: bookings.notes,
        occasion: bookings.occasion,
        status: bookings.status,
        source: bookings.source,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(diningTables, eq(bookings.tableId, diningTables.id))
      .where(and(gte(bookings.startsAt, from), lt(bookings.startsAt, to)))
      .orderBy(asc(bookings.startsAt)),
  ]);

  const monthDay = date.slice(5);
  const wholeDay = dayClosures.find((c) => c.zone === null);
  const now = florenceNow();
  return {
    date,
    weekday: weekdayOf(date),
    today: now.date,
    now: now.time,
    services: hours.map((h) => ({ service: h.service, opensAt: h.opensAt.slice(0, 5), lastSeatingAt: h.lastSeatingAt.slice(0, 5) })),
    seatingMinutes: config?.seatingMinutes ?? 120,
    tables: tables as BookTable[],
    closedZones: wholeDay ? ["sala", "galleria", "terrazza"] : (dayClosures.map((c) => c.zone).filter(Boolean) as ZoneSlug[]),
    closedReason: wholeDay?.reason ?? dayClosures[0]?.reason ?? null,
    terraceSeason: monthDay >= (config?.terraceOpensOn ?? "04-15") && monthDay <= (config?.terraceClosesOn ?? "10-31"),
    bookings: rows.map(({ startsAt, endsAt, createdAt, ...row }) => ({
      ...row,
      start: florenceWallClock(startsAt).time,
      // A seating that runs past midnight still ends on the timeline's last hour.
      end: florenceWallClock(endsAt).date > date ? "24:00" : florenceWallClock(endsAt).time,
      bookedOn: florenceWallClock(createdAt).date,
    })),
  };
}
