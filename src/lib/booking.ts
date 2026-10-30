import "server-only";

import { and, eq, gt, inArray, lt, notInArray } from "drizzle-orm";

import { db } from "@/db";
import { bookings, closures, diningTables, serviceHours, settings, zones } from "@/db/schema";

import { RESTAURANT_TIME_ZONE } from "./seasons";

/** How far ahead the house takes tables. */
export const BOOKING_WINDOW_DAYS = 60;
/** A table for tonight needs at least this much notice. */
const NOTICE_MINUTES = 30;

export type ZoneSlug = "sala" | "galleria" | "terrazza";

export type FreeTable = { label: string; zone: ZoneSlug; zoneName: string; seats: string; tags: string[] };
export type Slot = { service: "pranzo" | "cena"; time: string; tables: FreeTable[] };

export type DayAvailability =
  | { open: true; date: string; weekday: string; terraceLaid: boolean; slots: Slot[] }
  | { open: false; date: string; weekday: string; reason: string };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The restaurant's wall clock right now, as YYYY-MM-DD and HH:MM. */
export function florenceNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: RESTAURANT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(date: string, days: number) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/** Florence wall-clock date and time as a real instant, summer time included. */
export function florenceInstant(date: string, time: string) {
  const naive = Date.parse(`${date}T${time}:00Z`);
  // Two passes settle the offset even on the night the clocks change.
  let instant = naive;
  for (let i = 0; i < 2; i++) {
    const shown = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: RESTAURANT_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value]),
    );
    const asIfUtc = Date.parse(`${shown.year}-${shown.month}-${shown.day}T${shown.hour}:${shown.minute}:00Z`);
    instant += naive - asIfUtc;
  }
  return new Date(instant);
}

function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function clock(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function seatsOf(table: { minGuests: number; maxGuests: number }) {
  return table.minGuests === table.maxGuests ? `${table.maxGuests}` : `${table.minGuests}–${table.maxGuests}`;
}

/**
 * Every free table for a party on a day, slot by slot, the way the floor sees
 * it: the service hours of that weekday, closures, the terrace's season, and
 * the bookings already laid. Not cached: a table can go at any moment.
 */
export async function getAvailability(date: string, partySize: number, zone?: ZoneSlug): Promise<DayAvailability> {
  const weekday = weekdayOf(date);
  const now = florenceNow();
  const last = addDays(now.date, BOOKING_WINDOW_DAYS);
  if (date < now.date) return { open: false, date, weekday, reason: "That day has already gone by." };
  if (date > last) return { open: false, date, weekday, reason: `The book only runs ${BOOKING_WINDOW_DAYS} days ahead.` };

  const [hours, [config], dayClosures, allTables] = await Promise.all([
    db.select().from(serviceHours).where(eq(serviceHours.weekday, new Date(`${date}T12:00:00Z`).getUTCDay())),
    db.select().from(settings).limit(1),
    db.select({ zoneId: closures.zoneId, reason: closures.reason }).from(closures).where(eq(closures.date, date)),
    db
      .select({
        id: diningTables.id,
        label: diningTables.label,
        minGuests: diningTables.minGuests,
        maxGuests: diningTables.maxGuests,
        tags: diningTables.tags,
        zone: zones.slug,
        zoneName: zones.name,
        zoneId: zones.id,
        sortOrder: zones.sortOrder,
      })
      .from(diningTables)
      .innerJoin(zones, eq(diningTables.zoneId, zones.id))
      .where(eq(diningTables.isActive, true)),
  ]);

  if (hours.length === 0) return { open: false, date, weekday, reason: `Chiuso: the kitchen rests on ${weekday}s.` };
  const wholeDay = dayClosures.find((closure) => closure.zoneId === null);
  if (wholeDay) return { open: false, date, weekday, reason: wholeDay.reason ?? "The house is closed that day." };

  const monthDay = date.slice(5);
  const terraceSeason = monthDay >= (config?.terraceOpensOn ?? "04-15") && monthDay <= (config?.terraceClosesOn ?? "10-31");
  const closedZones = new Set(dayClosures.map((closure) => closure.zoneId));
  const terraceLaid = terraceSeason && !allTables.some((t) => t.zone === "terrazza" && closedZones.has(t.zoneId));

  const tables = allTables
    .filter((t) => partySize >= t.minGuests && partySize <= t.maxGuests)
    .filter((t) => !closedZones.has(t.zoneId))
    .filter((t) => t.zone !== "terrazza" || terraceSeason)
    .filter((t) => !zone || t.zone === zone)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.maxGuests - b.maxGuests || a.label.localeCompare(b.label));

  const seating = config?.seatingMinutes ?? 120;
  const step = config?.slotIntervalMinutes ?? 15;
  const earliest = date === now.date ? minutes(now.time) + NOTICE_MINUTES : 0;

  const services = hours.sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  const dayStart = florenceInstant(date, services[0].opensAt.slice(0, 5));
  const dayEnd = new Date(florenceInstant(date, services.at(-1)!.lastSeatingAt.slice(0, 5)).getTime() + seating * 60_000);

  const taken =
    tables.length === 0
      ? []
      : await db
          .select({ tableId: bookings.tableId, startsAt: bookings.startsAt, endsAt: bookings.endsAt })
          .from(bookings)
          .where(
            and(
              inArray(
                bookings.tableId,
                tables.map((t) => t.id),
              ),
              notInArray(bookings.status, ["cancelled", "no_show"]),
              lt(bookings.startsAt, dayEnd),
              gt(bookings.endsAt, dayStart),
            ),
          );

  const slots: Slot[] = [];
  for (const service of services) {
    for (let at = minutes(service.opensAt); at <= minutes(service.lastSeatingAt); at += step) {
      if (at < earliest) continue;
      const time = clock(at);
      const starts = florenceInstant(date, time).getTime();
      const ends = starts + seating * 60_000;
      const free = tables.filter(
        (t) => !taken.some((b) => b.tableId === t.id && b.startsAt.getTime() < ends && b.endsAt.getTime() > starts),
      );
      if (free.length > 0) {
        slots.push({
          service: service.service,
          time,
          tables: free.map((t) => ({ label: t.label, zone: t.zone as ZoneSlug, zoneName: t.zoneName, seats: seatsOf(t), tags: t.tags })),
        });
      }
    }
  }

  return { open: true, date, weekday, terraceLaid, slots };
}

/** A table held out for a guest, to be confirmed with their name and number. */
export type Offer = {
  date: string;
  weekday: string;
  time: string;
  partySize: number;
  table: FreeTable;
  occasion?: string;
  notes?: string;
};

/** Whether this very table is free for this party at this time, as an offer. */
export async function findOffer(input: {
  date: string;
  time: string;
  partySize: number;
  tableLabel: string;
  occasion?: string;
  notes?: string;
}): Promise<{ ok: true; offer: Offer } | { ok: false; reason: string; nearest: { time: string; tables: string[] }[] }> {
  const day = await getAvailability(input.date, input.partySize);
  if (!day.open) return { ok: false, reason: day.reason, nearest: [] };
  const slot = day.slots.find((s) => s.time === input.time);
  const table = slot?.tables.find((t) => t.label === input.tableLabel.toUpperCase());
  if (table) {
    return {
      ok: true,
      offer: {
        date: input.date,
        weekday: day.weekday,
        time: input.time,
        partySize: input.partySize,
        table,
        occasion: input.occasion,
        notes: input.notes,
      },
    };
  }
  // Suggest the closest times that still have a table for the party.
  const wanted = minutes(input.time);
  const nearest = [...day.slots]
    .sort((a, b) => Math.abs(minutes(a.time) - wanted) - Math.abs(minutes(b.time) - wanted))
    .slice(0, 3)
    .map((s) => ({ time: s.time, tables: s.tables.map((t) => t.label) }));
  return {
    ok: false,
    reason: slot ? `Table ${input.tableLabel} is not free for ${input.partySize} at ${input.time}.` : `No seating at ${input.time} that day.`,
    nearest,
  };
}

export type Guest = { name: string; email: string; phone: string };

export type Booked = { id: string; date: string; weekday: string; time: string; partySize: number; table: FreeTable; name: string };

/**
 * Lays the table for the guest. Everything is checked again here, and the
 * database's overlap constraint has the last word if two guests press at once.
 */
export async function createBooking(
  request: { date: string; time: string; partySize: number; tableLabel: string; occasion?: string; notes?: string },
  guest: Guest,
): Promise<{ ok: true; booking: Booked } | { ok: false; reason: string }> {
  const found = await findOffer(request);
  if (!found.ok) return { ok: false, reason: found.reason };
  const { offer } = found;

  const [table] = await db
    .select({ id: diningTables.id, seating: settings.seatingMinutes })
    .from(diningTables)
    .innerJoin(settings, eq(settings.id, 1))
    .where(eq(diningTables.label, offer.table.label));
  const startsAt = florenceInstant(offer.date, offer.time);
  const endsAt = new Date(startsAt.getTime() + (table.seating ?? 120) * 60_000);

  try {
    const [row] = await db
      .insert(bookings)
      .values({
        tableId: table.id,
        startsAt,
        endsAt,
        partySize: offer.partySize,
        guestName: guest.name,
        email: guest.email,
        phone: guest.phone,
        occasion: offer.occasion,
        notes: offer.notes,
        source: "web",
      })
      .returning({ id: bookings.id });
    return { ok: true, booking: { id: row.id, ...offer, name: guest.name } };
  } catch (error) {
    if (isOverlap(error)) return { ok: false, reason: "Someone took that table a moment ago." };
    throw error;
  }
}

/** Postgres exclusion_violation, however deep the driver wraps it. */
function isOverlap(error: unknown): boolean {
  for (let e = error as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === "23P01") return true;
  }
  return false;
}
