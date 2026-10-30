import type { NextRequest } from "next/server";
import { z } from "zod/v4";

import { getAvailability, getBooking, type ZoneSlug } from "@/lib/booking";

export type DayReply =
  | { open: false; date: string; weekday: string; reason: string }
  | {
      open: true;
      date: string;
      weekday: string;
      terraceLaid: boolean;
      closedZones: ZoneSlug[];
      slots: { service: "pranzo" | "cena"; time: string; free: string[] }[];
    };

const Query = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party: z.coerce.number().int().min(1).max(12),
  // The guest is moving this booking: its own table counts as free.
  change: z.string().max(80).optional(),
});

/** Every time of a day with the tables still free for a party. */
export async function GET(request: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { date, party, change } = parsed.data;
  const moving = change ? await getBooking(change) : null;
  const day = await getAvailability(date, party, undefined, moving?.id);
  const reply: DayReply = day.open
    ? { ...day, slots: day.slots.map((slot) => ({ service: slot.service, time: slot.time, free: slot.tables.map((t) => t.label) })) }
    : day;
  return Response.json(reply, { headers: { "cache-control": "no-store" } });
}
