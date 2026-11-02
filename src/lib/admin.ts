import "server-only";

import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import { bookings, closures, dailyDishes, diningTables, galleryImages, menuCategories, menuItems, serviceHours, settings, zones } from "@/db/schema";

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

export type Closure = { id: number; date: string; zone: ZoneSlug | null; reason: string | null };

/** A run of days closed the same way, as the list of closures shows it. */
export type ClosureRun = { ids: number[]; from: string; to: string; zone: ZoneSlug | null; reason: string | null };

export type CalendarCell = {
  date: string;
  /** The house's weekly day of rest, with no service at all. */
  rest: boolean;
  terrace: boolean;
  closures: Closure[];
  /** Live bookings per room, so the maître sees whom a closure touches. */
  booked: Record<ZoneSlug, number>;
};

export type ClosureBook = {
  today: string;
  month: string;
  months: { month: string; days: CalendarCell[] }[];
  upcoming: ClosureRun[];
  season: { opensOn: string; closesOn: string };
};

function monthDays(month: string) {
  const first = `${month}-01`;
  const days: string[] = [];
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  return days;
}

export function nextMonth(month: string, by = 1) {
  const [y, m] = month.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1 + by, 1));
  return at.toISOString().slice(0, 7);
}

export async function getClosureBook(month: string): Promise<ClosureBook> {
  const today = florenceNow().date;
  const shown = [month, nextMonth(month)];
  const first = `${shown[0]}-01`;
  const end = `${nextMonth(month, 2)}-01`;
  const [hours, [config], inView, ahead, live] = await Promise.all([
    db.selectDistinct({ weekday: serviceHours.weekday }).from(serviceHours),
    db.select().from(settings).limit(1),
    db
      .select({ id: closures.id, date: closures.date, zone: zones.slug, reason: closures.reason })
      .from(closures)
      .leftJoin(zones, eq(closures.zoneId, zones.id))
      .where(and(gte(closures.date, first), lt(closures.date, end))),
    db
      .select({ id: closures.id, date: closures.date, zone: zones.slug, reason: closures.reason })
      .from(closures)
      .leftJoin(zones, eq(closures.zoneId, zones.id))
      .where(gte(closures.date, today))
      .orderBy(asc(closures.date)),
    db
      .select({ startsAt: bookings.startsAt, zone: zones.slug })
      .from(bookings)
      .innerJoin(diningTables, eq(bookings.tableId, diningTables.id))
      .innerJoin(zones, eq(diningTables.zoneId, zones.id))
      .where(
        and(
          gte(bookings.startsAt, florenceInstant(first, "00:00")),
          lt(bookings.startsAt, florenceInstant(end, "00:00")),
          inArray(bookings.status, ["confirmed", "seated"]),
        ),
      ),
  ]);

  const serving = new Set(hours.map((h) => h.weekday));
  const opensOn = config?.terraceOpensOn ?? "04-15";
  const closesOn = config?.terraceClosesOn ?? "10-31";
  const booked = new Map<string, Record<ZoneSlug, number>>();
  for (const b of live) {
    const date = florenceWallClock(b.startsAt).date;
    const counts = booked.get(date) ?? { sala: 0, galleria: 0, terrazza: 0 };
    counts[b.zone as ZoneSlug]++;
    booked.set(date, counts);
  }

  // Consecutive days closed the same way read as one line: "12–14 Nov, La Terrazza, private event".
  const upcoming: ClosureRun[] = [];
  for (const c of ahead) {
    const last = upcoming.at(-1);
    if (last && last.zone === c.zone && last.reason === c.reason && addDays(last.to, 1) === c.date) {
      last.to = c.date;
      last.ids.push(c.id);
    } else upcoming.push({ ids: [c.id], from: c.date, to: c.date, zone: c.zone as ZoneSlug | null, reason: c.reason });
  }

  return {
    today,
    month,
    months: shown.map((m) => ({
      month: m,
      days: monthDays(m).map((date) => ({
        date,
        rest: !serving.has(new Date(`${date}T12:00:00Z`).getUTCDay()),
        terrace: date.slice(5) >= opensOn && date.slice(5) <= closesOn,
        closures: inView.filter((c) => c.date === date).map((c) => ({ ...c, zone: c.zone as ZoneSlug | null })),
        booked: booked.get(date) ?? { sala: 0, galleria: 0, terrazza: 0 },
      })),
    })),
    upcoming,
    season: { opensOn, closesOn },
  };
}

export type CartaDish = typeof menuItems.$inferSelect;
export type CartaChapter = { id: number; slug: string; name: string; subtitle: string | null; dishes: CartaDish[] };
export type CartaDaily = typeof dailyDishes.$inferSelect;

/** The whole menu as the kitchen keeps it, sold-out dishes included, and the board for the week ahead. */
export async function getCarta(): Promise<{ today: string; chapters: CartaChapter[]; daily: CartaDaily[] }> {
  const today = florenceNow().date;
  const [chapters, dishes, daily] = await Promise.all([
    db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder)),
    db.select().from(menuItems).orderBy(asc(menuItems.sortOrder), asc(menuItems.id)),
    db
      .select()
      .from(dailyDishes)
      .where(and(gte(dailyDishes.date, today), lt(dailyDishes.date, addDays(today, 7))))
      .orderBy(asc(dailyDishes.date), asc(dailyDishes.sortOrder), asc(dailyDishes.id)),
  ]);
  return {
    today,
    chapters: chapters.map((c) => ({ id: c.id, slug: c.slug, name: c.name, subtitle: c.subtitle, dishes: dishes.filter((d) => d.categoryId === c.id) })),
    daily,
  };
}

/** The gallery read fresh, not through its cache, so a change shows in the admin at once. */
export async function getWall() {
  return db.select().from(galleryImages).orderBy(asc(galleryImages.sortOrder), asc(galleryImages.id));
}
