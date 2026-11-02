import { describe, expect, test } from "bun:test";

import { addDays, florenceInstant, florenceWallClock, weekdayOf } from "@/lib/booking";
import { formatPrice } from "@/lib/menu";
import { Price } from "@/lib/price";
import { seasonForDate } from "@/lib/seasons";

describe("the Florence clock", () => {
  test("winter evenings are an hour ahead of UTC", () => {
    expect(florenceInstant("2026-11-06", "20:00").toISOString()).toBe("2026-11-06T19:00:00.000Z");
  });

  test("summer evenings are two hours ahead", () => {
    expect(florenceInstant("2026-07-10", "20:00").toISOString()).toBe("2026-07-10T18:00:00.000Z");
  });

  test("the days the clocks change land on the right side", () => {
    // Summer time starts on 29 March 2026 and ends on 25 October 2026.
    expect(florenceInstant("2026-03-29", "12:30").toISOString()).toBe("2026-03-29T10:30:00.000Z");
    expect(florenceInstant("2026-10-25", "12:30").toISOString()).toBe("2026-10-25T11:30:00.000Z");
  });

  test("an instant reads back as the same wall clock", () => {
    for (const [date, time] of [
      ["2026-01-15", "12:30"],
      ["2026-06-21", "22:00"],
      ["2026-10-25", "19:15"],
    ]) {
      expect(florenceWallClock(florenceInstant(date, time))).toEqual({ date, time });
    }
  });

  test("days roll over months and years", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("weekdays", () => {
    expect(weekdayOf("2026-11-02")).toBe("Monday");
    expect(weekdayOf("2026-11-08")).toBe("Sunday");
  });

  test("seasons turn by the month in Florence", () => {
    expect(seasonForDate(new Date("2026-11-02T12:00:00Z"))).toBe("autumn");
    expect(seasonForDate(new Date("2026-12-01T12:00:00Z"))).toBe("winter");
    expect(seasonForDate(new Date("2027-04-10T12:00:00Z"))).toBe("spring");
    expect(seasonForDate(new Date("2027-07-10T12:00:00Z"))).toBe("summer");
    // Still 30 November in UTC, already 1 December in Florence.
    expect(seasonForDate(new Date("2026-11-30T23:30:00Z"))).toBe("winter");
  });
});

describe("prices", () => {
  test("the kitchen's ways of writing a price all read as cents", () => {
    for (const [written, cents] of [
      ["18", 1800],
      ["18,50", 1850],
      ["€ 18.5", 1850],
      [" 7 ", 700],
      ["120.05", 12005],
    ] as const) {
      expect(Price.parse(written)).toBe(cents);
    }
  });

  test("nonsense is refused", () => {
    for (const written of ["", "diciotto", "18.555", "-5", "18,50,00"]) expect(Price.safeParse(written).success).toBe(false);
  });

  test("menus print whole euros bare and the rest with cents", () => {
    expect(formatPrice(1800)).toBe("€18");
    expect(formatPrice(1450)).toBe("€14.50");
    expect(formatPrice(1405)).toBe("€14.05");
  });
});
