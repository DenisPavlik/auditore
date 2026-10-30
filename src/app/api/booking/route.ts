import { headers } from "next/headers";
import { z } from "zod/v4";

import { createBooking, getBooking, type Booked } from "@/lib/booking";
import { sendConfirmation } from "@/lib/letters";
import { admitVisitor } from "@/lib/volpe";

export type BookReply = { ok: true; booking: Booked; lettered: boolean } | { ok: false; reason: string };

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(12),
  tableLabel: z.string().min(1).max(4),
  occasion: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{6,24}$/),
  /** The manage token of a booking this one takes the place of. */
  replaces: z.string().max(80).optional(),
});

/**
 * A guest confirms a table, from the booking page or from the card La Volpe held out
 * at his desk. This is the only way a booking is made: the fox himself can't lay a table.
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

  const { name, email, phone, replaces, ...wanted } = parsed.data;
  const result = await createBooking(
    { ...wanted, occasion: wanted.occasion || undefined, notes: wanted.notes || undefined },
    { name, email, phone },
    replaces,
  );
  if (!result.ok) return Response.json(result satisfies BookReply, { status: 409 });

  const held = await getBooking(result.booking.token);
  const manageUrl = `${new URL(request.url).origin}/prenota/${result.booking.token}`;
  const lettered = held ? await sendConfirmation(held, manageUrl).catch(() => false) : false;
  return Response.json({ ...result, lettered } satisfies BookReply);
}
