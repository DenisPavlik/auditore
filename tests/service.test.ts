import { describe, expect, test } from "bun:test";

import { defaultService, windows } from "@/components/admin/service";
import type { DayBook } from "@/lib/admin";

const book = (over: Partial<DayBook>): DayBook => ({
  date: "2026-11-06",
  weekday: "Friday",
  today: "2026-11-06",
  now: "10:00",
  services: [
    { service: "pranzo", opensAt: "12:30", lastSeatingAt: "14:30" },
    { service: "cena", opensAt: "19:00", lastSeatingAt: "22:00" },
  ],
  seatingMinutes: 120,
  tables: [],
  closedZones: [],
  closedReason: null,
  terraceSeason: false,
  bookings: [],
  ...over,
});

describe("the timeline's stretch of the clock", () => {
  test("starts on the hour before opening and ends when the last seating leaves", () => {
    const [lunch, dinner] = windows(book({}));
    expect([lunch.from, lunch.to]).toEqual([12 * 60, 17 * 60]);
    expect([dinner.from, dinner.to]).toEqual([18 * 60, 24 * 60]);
  });

  test("never runs past midnight", () => {
    const [late] = windows(book({ services: [{ service: "cena", opensAt: "20:00", lastSeatingAt: "23:30" }] }));
    expect(late.to).toBe(24 * 60);
  });
});

describe("which service the book opens on", () => {
  test("today, the service under way or next", () => {
    expect(defaultService(book({ now: "10:00" }))).toBe("pranzo");
    expect(defaultService(book({ now: "16:30" }))).toBe("pranzo");
    expect(defaultService(book({ now: "17:00" }))).toBe("cena");
  });

  test("any other day, dinner", () => {
    expect(defaultService(book({ date: "2026-11-07", now: "10:00" }))).toBe("cena");
  });
});
