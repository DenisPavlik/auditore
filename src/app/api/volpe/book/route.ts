import { headers } from "next/headers";
import { z } from "zod/v4";

import { createBooking, type Booked } from "@/lib/booking";
import { admitVisitor } from "@/lib/volpe";

export type BookReply = { ok: true; booking: Booked } | { ok: false; reason: string };

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(12),
  tableLabel: z.string().min(1).max(4),
  occasion: z.string().max(60).optional(),
  notes: z.string().max(200).optional(),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{6,24}$/),
});

/**
 * The guest pressed Confirm on the card La Volpe held out. This is the only
 * way his offer becomes a booking: the fox himself can't lay a table.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, reason: "Please check your name, email and phone." } satisfies BookReply, { status: 400 });
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await admitVisitor(ip))) {
    return Response.json({ ok: false, reason: "Too many tries today. Please call us instead." } satisfies BookReply, { status: 429 });
  }

  const { name, email, phone, ...wanted } = parsed.data;
  const result = await createBooking(wanted, { name, email, phone });
  return Response.json(result satisfies BookReply, { status: result.ok ? 200 : 409 });
}
