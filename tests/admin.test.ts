import { afterAll, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { asc, eq } from "drizzle-orm";

import { addBooking, addClosure, moveBooking, reopen, setStatus, setTerraceSeason } from "@/app/admin/actions";
import { addDaily, moveDish, saveDish, setAvailable } from "@/app/admin/carta-actions";
import { bookings, closures, menuCategories, menuItems } from "@/db/schema";
import { getClosureBook, getDayBook } from "@/lib/admin";
import { florenceInstant, getAvailability } from "@/lib/booking";

import { clearBook, db } from "./db";
import { asDemo, asOwner } from "./staff";

const FRIDAY = "2026-11-06";
const phoned = { date: FRIDAY, table: "S1", partySize: "2", name: "Marco Bellini", phone: "+39 055 210 4400", email: "", notes: "", source: "phone" as const };

const bookingOn = async (table: string) => (await getDayBook(FRIDAY)).bookings.find((b) => b.table === table)!;

beforeEach(async () => {
  setSystemTime(florenceInstant("2026-11-03", "10:00"));
  asOwner();
  await clearBook();
});
afterAll(() => setSystemTime());

describe("the timeline's book", () => {
  test("a telephone booking is written for two hours and read back on the Florence clock", async () => {
    expect(await addBooking({ ...phoned, time: "20:00" })).toEqual({ ok: true });
    expect(await bookingOn("S1")).toMatchObject({ start: "20:00", end: "22:00", status: "confirmed", source: "phone", name: "Marco Bellini" });
  });

  test("guests at the door are seated at once, and need no telephone", async () => {
    expect(await addBooking({ ...phoned, time: "19:00", phone: "", source: "walk_in" })).toEqual({ ok: true });
    expect((await bookingOn("S1")).status).toBe("seated");
  });

  test("a telephone booking without a number is refused", async () => {
    expect(await addBooking({ ...phoned, time: "20:00", phone: "" })).toMatchObject({ ok: false });
  });

  test("a table taken at that hour is refused, and so is a party too big for it", async () => {
    await addBooking({ ...phoned, time: "20:00" });
    expect(await addBooking({ ...phoned, time: "21:00", name: "Other" })).toMatchObject({ ok: false, reason: "S1 is taken at 21:00." });
    expect(await addBooking({ ...phoned, time: "12:30", partySize: "4" })).toMatchObject({ ok: false, reason: "S1 seats only 2." });
  });

  test("guests who leave early give the rest of their seating back", async () => {
    await addBooking({ ...phoned, time: "19:00", source: "walk_in" });
    const b = await bookingOn("S1");
    setSystemTime(florenceInstant(FRIDAY, "20:00"));
    expect(await setStatus(b.id, "completed")).toEqual({ ok: true });
    expect((await bookingOn("S1")).end).toBe("20:00");
    const day = await getAvailability(FRIDAY, 2);
    if (!day.open) throw new Error("closed");
    expect(day.slots.find((s) => s.time === "20:30")?.tables.map((t) => t.label)).toContain("S1");
  });

  test("a no-show can be restored only while the table is still free", async () => {
    await addBooking({ ...phoned, time: "20:00" });
    const first = await bookingOn("S1");
    await setStatus(first.id, "no_show");
    await addBooking({ ...phoned, time: "20:15", name: "Walked in" });
    expect(await setStatus(first.id, "confirmed")).toMatchObject({ ok: false, reason: "Someone else sits at that table by now." });
  });

  test("a booking moves only to a table that fits and is free", async () => {
    await addBooking({ ...phoned, time: "20:00" });
    await addBooking({ ...phoned, table: "S2", time: "20:30", name: "Other" });
    const b = await bookingOn("S1");
    expect(await moveBooking(b.id, "S2")).toEqual({ ok: false, reason: "S2 is taken at that hour." });
    expect(await moveBooking(b.id, "G1")).toEqual({ ok: true });
    expect((await getDayBook(FRIDAY)).bookings.find((x) => x.id === b.id)?.table).toBe("G1");
    await addBooking({ ...phoned, table: "S5", time: "12:30", partySize: "6", name: "Six" });
    expect(await moveBooking((await bookingOn("S5")).id, "S1")).toEqual({ ok: false, reason: "S1 seats only 2." });
  });

  test("the demo account can look but not write", async () => {
    asDemo();
    expect(await addBooking({ ...phoned, time: "20:00" })).toMatchObject({ ok: false, reason: "The demo can look around, but not write in the book." });
    expect((await db.select().from(bookings)).length).toBe(0);
    expect((await addClosure({ from: FRIDAY, to: FRIDAY, zone: null, reason: "Holiday" })).ok).toBe(false);
    expect((await addDaily({ date: FRIDAY, name: "Pici", description: "", price: "16" })).ok).toBe(false);
  });
});

describe("closures", () => {
  test("a run of days closes a room, and opens again in one go", async () => {
    expect(await addClosure({ from: "2026-11-12", to: "2026-11-14", zone: "galleria", reason: "Private event" })).toEqual({ ok: true });
    const book = await getClosureBook("2026-11");
    expect(book.upcoming).toEqual([{ ids: expect.any(Array), from: "2026-11-12", to: "2026-11-14", zone: "galleria", reason: "Private event" }]);
    expect(await addClosure({ from: "2026-11-13", to: "2026-11-13", zone: "galleria", reason: "Again" })).toMatchObject({ ok: false });
    await reopen(book.upcoming[0].ids);
    expect((await db.select().from(closures)).length).toBe(0);
  });

  test("closing the whole house folds the room closures of those days into it", async () => {
    await addClosure({ from: FRIDAY, to: FRIDAY, zone: "terrazza", reason: "Rain" });
    await addClosure({ from: FRIDAY, to: FRIDAY, zone: null, reason: "Holiday" });
    const rows = await db.select().from(closures);
    expect(rows).toEqual([expect.objectContaining({ date: FRIDAY, zoneId: null, reason: "Holiday" })]);
  });

  test("bad ranges and seasons are refused", async () => {
    expect(await addClosure({ from: "2026-11-14", to: "2026-11-12", zone: null, reason: "x" })).toMatchObject({ ok: false });
    expect(await addClosure({ from: "2026-11-12", to: "2026-11-12", zone: null, reason: " " })).toMatchObject({ ok: false });
    expect(await setTerraceSeason("10-31", "04-15")).toMatchObject({ ok: false });
    expect(await setTerraceSeason("02-30x", "10-31")).toMatchObject({ ok: false });
    expect(await setTerraceSeason("04-01", "11-15")).toEqual({ ok: true });
  });
});

describe("the menu", () => {
  const chapter = async (slug: string) => (await db.select().from(menuCategories).where(eq(menuCategories.slug, slug)))[0];
  const names = async (categoryId: number) =>
    (await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(asc(menuItems.sortOrder), asc(menuItems.id))).map((d) => d.name);

  test("a new dish goes to the end of its chapter, priced as written", async () => {
    const dolci = await chapter("dolci");
    const saved = await saveDish({ id: null, categoryId: dolci.id, name: "Bomboloni di prova", description: "", price: "8,50", tags: ["vegan"], season: "winter", isAvailable: true });
    expect(saved.ok).toBe(true);
    const [dish] = await db.select().from(menuItems).where(eq(menuItems.name, "Bomboloni di prova"));
    // Outside the seasonal chapter a dish is there all year.
    expect(dish).toMatchObject({ priceCents: 850, season: null, tags: ["vegan"] });
    expect((await names(dolci.id)).at(-1)).toBe("Bomboloni di prova");
    await db.delete(menuItems).where(eq(menuItems.id, dish.id));
  });

  test("arrows swap a dish with its neighbour, and Finito hides it", async () => {
    const antipasti = await chapter("antipasti");
    const [first, second] = await names(antipasti.id);
    const [dish] = await db.select().from(menuItems).where(eq(menuItems.name, first));
    await moveDish(dish.id, 1);
    expect((await names(antipasti.id)).slice(0, 2)).toEqual([second, first]);
    await moveDish(dish.id, -1);
    await setAvailable(dish.id, false);
    expect((await db.select().from(menuItems).where(eq(menuItems.id, dish.id)))[0].isAvailable).toBe(false);
    await setAvailable(dish.id, true);
  });

  test("the board holds six dishes a day", async () => {
    for (let i = 0; i < 6; i++) expect((await addDaily({ date: FRIDAY, name: `Piatto ${i}`, description: "", price: "12" })).ok).toBe(true);
    expect(await addDaily({ date: FRIDAY, name: "Settimo", description: "", price: "12" })).toMatchObject({ ok: false });
  });
});
