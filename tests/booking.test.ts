import { afterAll, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { eq } from "drizzle-orm";

import { bookings, closures, diningTables, settings, zones } from "@/db/schema";
import { cancelBooking, createBooking, florenceInstant, getAvailability, getBooking, getCalendar, isOverlap } from "@/lib/booking";

import { clearBook, db } from "./db";

// Tuesday 3 November 2026, ten in the morning in Florence.
const NOW = florenceInstant("2026-11-03", "10:00");
const FRIDAY = "2026-11-06";
const guest = { name: "Lucia Ferri", email: "lucia@example.com", phone: "+39 331 204 1187" };

const tablesAt = async (date: string, party: number, time: string) => {
  const day = await getAvailability(date, party);
  if (!day.open) throw new Error(day.reason);
  return day.slots.find((s) => s.time === time)?.tables.map((t) => t.label) ?? [];
};

beforeEach(async () => {
  setSystemTime(NOW);
  await clearBook();
});
afterAll(() => setSystemTime());

describe("which tables a party is offered", () => {
  test("a couple gets the tables for two, and only those", async () => {
    expect((await tablesAt(FRIDAY, 2, "20:00")).sort()).toEqual(["G1", "G2", "G3", "S1", "S2"]);
  });

  test("three or four get a table for four, never one for five or six", async () => {
    expect((await tablesAt(FRIDAY, 3, "20:00")).sort()).toEqual(["G4", "S3", "S4", "S7"]);
  });

  test("five or six get the round table, the long one or a booth", async () => {
    expect((await tablesAt(FRIDAY, 6, "20:00")).sort()).toEqual(["B1", "B2", "S5", "S6"]);
  });

  test("a big party gets the family table", async () => {
    expect(await tablesAt(FRIDAY, 10, "20:00")).toEqual(["F1"]);
  });

  test("the terrace is offered only in its season", async () => {
    expect((await tablesAt(FRIDAY, 2, "20:00")).some((t) => t.startsWith("T"))).toBe(false);
    await db.update(settings).set({ terraceClosesOn: "11-30" }).where(eq(settings.id, 1));
    expect(await tablesAt(FRIDAY, 2, "20:00")).toContain("T1");
  });
});

describe("which days and hours the house is open", () => {
  test("Mondays the kitchen rests", async () => {
    const day = await getAvailability("2026-11-09", 2);
    expect(day.open).toBe(false);
  });

  test("days gone by are closed", async () => {
    const day = await getAvailability("2026-11-02", 2);
    expect(day).toMatchObject({ open: false, reason: "That day has already gone by." });
  });

  test("the book only runs sixty days ahead", async () => {
    expect((await getAvailability("2027-01-02", 2)).open).toBe(true);
    expect((await getAvailability("2027-01-03", 2)).open).toBe(false);
  });

  test("today, the first table is half an hour away at least", async () => {
    setSystemTime(florenceInstant(FRIDAY, "18:50"));
    const day = await getAvailability(FRIDAY, 2);
    if (!day.open) throw new Error("closed");
    expect(day.slots[0].time).toBe("19:30");
    expect(day.slots.some((s) => s.service === "pranzo")).toBe(false);
  });

  test("lunch and dinner every fifteen minutes up to the last seating", async () => {
    const day = await getAvailability(FRIDAY, 2);
    if (!day.open) throw new Error("closed");
    const times = day.slots.map((s) => s.time);
    expect(times[0]).toBe("12:30");
    expect(times).toContain("14:30");
    expect(times).not.toContain("14:45");
    expect(times.at(-1)).toBe("22:00");
  });
});

describe("closures", () => {
  test("a room closed for the day disappears from the offer", async () => {
    const [galleria] = await db.select().from(zones).where(eq(zones.slug, "galleria"));
    await db.insert(closures).values({ date: FRIDAY, zoneId: galleria.id, reason: "Private event" });
    const day = await getAvailability(FRIDAY, 2);
    if (!day.open) throw new Error("closed");
    expect(day.closedZones).toEqual(["galleria"]);
    expect(day.slots.flatMap((s) => s.tables).some((t) => t.zone === "galleria")).toBe(false);
  });

  test("the whole house closed shows its reason to the guest", async () => {
    await db.insert(closures).values({ date: FRIDAY, zoneId: null, reason: "Holiday" });
    expect(await getAvailability(FRIDAY, 2)).toMatchObject({ open: false, reason: "Holiday" });
    const calendar = await getCalendar();
    expect(calendar.find((d) => d.date === FRIDAY)).toMatchObject({ open: false, reason: "Holiday" });
    expect(calendar.find((d) => d.date === "2026-11-09")).toMatchObject({ open: false, reason: "Chiuso" });
  });
});

describe("booking a table", () => {
  const request = { date: FRIDAY, time: "20:00", partySize: 2, tableLabel: "G3" };

  test("a free table is booked for two hours and its card can be read back", async () => {
    const made = await createBooking(request, guest);
    if (!made.ok) throw new Error(made.reason);
    const held = await getBooking(made.booking.token);
    expect(held).toMatchObject({ status: "confirmed", time: "20:00", partySize: 2, table: { label: "G3" } });
    expect(held!.endsAt.getTime() - held!.startsAt.getTime()).toBe(120 * 60_000);
    expect(await tablesAt(FRIDAY, 2, "21:45")).not.toContain("G3");
    expect(await tablesAt(FRIDAY, 2, "22:00")).toContain("G3");
  });

  test("the same table at an overlapping hour is refused", async () => {
    expect((await createBooking(request, guest)).ok).toBe(true);
    const again = await createBooking({ ...request, time: "21:00" }, { ...guest, email: "other@example.com" });
    expect(again.ok).toBe(false);
  });

  test("a table for four is refused to a couple", async () => {
    const made = await createBooking({ ...request, tableLabel: "S3" }, guest);
    expect(made.ok).toBe(false);
  });

  test("the database itself refuses two live bookings on one table at once", async () => {
    const [g3] = await db.select().from(diningTables).where(eq(diningTables.label, "G3"));
    const row = { tableId: g3.id, partySize: 2, guestName: "A", email: "a@example.com", phone: "1" };
    await db.insert(bookings).values({ ...row, startsAt: florenceInstant(FRIDAY, "20:00"), endsAt: florenceInstant(FRIDAY, "22:00") });
    const clash = await db
      .insert(bookings)
      .values({ ...row, startsAt: florenceInstant(FRIDAY, "21:00"), endsAt: florenceInstant(FRIDAY, "23:00") })
      .then(() => null, (error: unknown) => error);
    expect(isOverlap(clash)).toBe(true);
    // Back to back is fine, and so is a cancelled booking in the way.
    await db.insert(bookings).values({ ...row, startsAt: florenceInstant(FRIDAY, "22:00"), endsAt: florenceInstant(FRIDAY, "23:59") });
    await db.insert(bookings).values({ ...row, status: "cancelled", startsAt: florenceInstant(FRIDAY, "20:30"), endsAt: florenceInstant(FRIDAY, "22:30") });
  });

  test("moving a booking frees its old hour and keeps the guest's table", async () => {
    const made = await createBooking(request, guest);
    if (!made.ok) throw new Error(made.reason);
    // Half an hour later on the same table overlaps the booking itself, which steps aside for it.
    const moved = await createBooking({ ...request, time: "20:30" }, guest, made.booking.token);
    if (!moved.ok) throw new Error(moved.reason);
    expect((await getBooking(made.booking.token))?.status).toBe("cancelled");
    expect(await getBooking(moved.booking.token)).toMatchObject({ status: "confirmed", time: "20:30" });
  });

  test("a move that cannot stand leaves the old booking as it was", async () => {
    const mine = await createBooking(request, guest);
    const theirs = await createBooking({ ...request, tableLabel: "G2" }, { ...guest, email: "b@example.com" });
    if (!mine.ok || !theirs.ok) throw new Error("setup");
    const moved = await createBooking({ ...request, tableLabel: "G2" }, guest, mine.booking.token);
    expect(moved.ok).toBe(false);
    expect((await getBooking(mine.booking.token))?.status).toBe("confirmed");
  });

  test("a guest cancels once, and the table is offered again", async () => {
    const made = await createBooking(request, guest);
    if (!made.ok) throw new Error(made.reason);
    expect(await cancelBooking(made.booking.token)).toEqual({ ok: true });
    expect((await cancelBooking(made.booking.token)).ok).toBe(false);
    expect(await tablesAt(FRIDAY, 2, "20:00")).toContain("G3");
  });

  test("a token that isn't one finds nothing", async () => {
    expect(await getBooking("not-a-token")).toBeNull();
    expect(await getBooking("a".repeat(64))).toBeNull();
  });
});
