import { afterAll, beforeEach, describe, expect, setSystemTime, test } from "bun:test";

import { bookings, dailyDishes } from "@/db/schema";
import { florenceInstant, florenceWallClock, weekdayOf } from "@/lib/booking";
import { advanceDemoBook, fillDemoBook } from "@/lib/demo-book";

import { clearBook, db } from "./db";

beforeEach(async () => {
  setSystemTime(florenceInstant("2026-11-03", "20:40"));
  await clearBook();
});
afterAll(() => setSystemTime());

describe("the made-up regulars", () => {
  test("book a week back to three weeks ahead, never on the day of rest, and only as themselves", async () => {
    const { added, chalked } = await fillDemoBook();
    expect(added).toBeGreaterThan(150);
    expect(chalked).toBeGreaterThan(0);
    const rows = await db.select().from(bookings);
    expect(rows.every((b) => b.email.endsWith("@ospiti.example"))).toBe(true);
    const days = new Set(rows.map((b) => florenceWallClock(b.startsAt).date));
    expect([...days].some((d) => weekdayOf(d) === "Monday")).toBe(false);
    expect([...days].sort()[0]).toBe("2026-10-27");
  });

  test("filling again adds nobody to days already booked", async () => {
    await fillDemoBook();
    expect(await fillDemoBook()).toEqual({ added: 0, chalked: 0 });
  });

  test("the same day always gets the same guests", async () => {
    await fillDemoBook();
    const first = (await db.select().from(bookings)).map((b) => `${b.guestName}${b.startsAt.toISOString()}`).sort();
    await clearBook();
    await fillDemoBook();
    const second = (await db.select().from(bookings)).map((b) => `${b.guestName}${b.startsAt.toISOString()}`).sort();
    expect(second).toEqual(first);
  });

  test("come and go with the clock", async () => {
    await fillDemoBook();
    await advanceDemoBook();
    const now = new Date();
    const rows = await db.select().from(bookings);
    // Nobody is still expected once their seating is over, nor at table before it starts.
    expect(rows.filter((b) => b.endsAt <= now && b.status === "confirmed")).toHaveLength(0);
    expect(rows.filter((b) => b.startsAt > now && (b.status === "seated" || b.status === "completed"))).toHaveLength(0);
    expect(rows.some((b) => b.status === "no_show")).toBe(true);
    expect(rows.some((b) => b.status === "completed")).toBe(true);
  });

  test("chalk two or three dishes on every working day of the week ahead", async () => {
    await fillDemoBook();
    const board = await db.select().from(dailyDishes);
    const perDay = Object.groupBy(board, (d) => d.date);
    expect(Object.keys(perDay)).not.toContain("2026-11-09");
    for (const dishes of Object.values(perDay)) expect(dishes!.length).toBeGreaterThanOrEqual(2);
  });
});
