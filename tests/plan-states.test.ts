import { describe, expect, test } from "bun:test";

import { statesFor } from "@/components/booking/booking-flow";
import { getFloorPlan } from "@/lib/booking";

const day = {
  open: true as const,
  date: "2026-11-06",
  weekday: "Friday",
  terraceLaid: false,
  closedZones: [],
  slots: [{ service: "cena" as const, time: "20:00", free: ["S1", "G1", "G2", "S3", "S4"] }],
};

describe("how each table looks on the guest's plan", async () => {
  const tables = await getFloorPlan();

  test("a couple sees tables for four as not for them, not as free", () => {
    const states = statesFor(tables, day, "20:00", 2, null, new Set());
    expect(states.S1).toBe("free");
    expect(states.S3).toBe("unfit");
    expect(states.S5).toBe("unfit");
  });

  test("a table for two that is taken shows as taken", () => {
    expect(statesFor(tables, day, "20:00", 2, null, new Set()).S2).toBe("taken");
  });

  test("the terrace out of season, and a closed room, show as closed", () => {
    const states = statesFor(tables, { ...day, closedZones: ["galleria"] }, "20:00", 2, null, new Set());
    expect(states.T1).toBe("closed");
    expect(states.G1).toBe("closed");
  });

  test("filters by room and by wish leave only the matching free tables", () => {
    const window = statesFor(tables, day, "20:00", 2, null, new Set(["window"]));
    expect(window.G1).toBe("free");
    expect(window.S1).toBe("unfit");
    const sala = statesFor(tables, day, "20:00", 2, "sala", new Set());
    expect(sala.S1).toBe("free");
    expect(sala.G1).toBe("unfit");
  });

  test("before a day is read, nothing is offered", () => {
    expect(Object.values(statesFor(tables, null, null, 2, null, new Set())).every((s) => s === "unfit")).toBe(true);
  });
});
