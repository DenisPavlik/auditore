"use server";

import { APIError } from "better-auth/api";
import { and, eq, inArray } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { db } from "@/db";
import { bookings, closures, diningTables, settings, zones } from "@/db/schema";
import { auth, DEMO, getStaff } from "@/lib/auth";
import { addDays, florenceInstant, isOverlap } from "@/lib/booking";

export type Done = { ok: true } | { ok: false; reason: string };

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const demo = form.get("demo") === "1";
  try {
    await auth.api.signInEmail({
      body: demo ? DEMO : { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") },
    });
  } catch (error) {
    if (error instanceof APIError) return "That name and key don't open the book.";
    throw error;
  }
  redirect("/admin");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/accedi");
}

/** Only the owner writes in the book; the demo account is told so, kindly. */
async function owner(): Promise<Done | null> {
  const staff = await getStaff();
  if (!staff) return { ok: false, reason: "Sign in again, the session has ended." };
  if (staff.role !== "owner") return { ok: false, reason: "The demo can look around, but not write in the book." };
  return null;
}

const Status = z.enum(["confirmed", "seated", "completed", "no_show", "cancelled"]);

export async function setStatus(id: string, next: z.infer<typeof Status>): Promise<Done> {
  const denied = await owner();
  if (denied) return denied;
  const status = Status.parse(next);
  const [row] = await db.select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt }).from(bookings).where(eq(bookings.id, z.uuid().parse(id)));
  if (!row) return { ok: false, reason: "That booking is no longer in the book." };

  // Guests who leave early give the rest of their seating back to the table.
  const now = new Date();
  const endsAt = status === "completed" && now > row.startsAt && now < row.endsAt ? now : undefined;
  try {
    await db.update(bookings).set({ status, ...(endsAt && { endsAt }) }).where(eq(bookings.id, id));
  } catch (error) {
    // Bringing back a no-show or a cancelled booking can clash with whoever took the table since.
    if (isOverlap(error)) return { ok: false, reason: "Someone else sits at that table by now." };
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function moveBooking(id: string, table: string): Promise<Done> {
  const denied = await owner();
  if (denied) return denied;
  const [[booking], [target]] = await Promise.all([
    db.select({ partySize: bookings.partySize }).from(bookings).where(eq(bookings.id, z.uuid().parse(id))),
    db.select().from(diningTables).where(and(eq(diningTables.label, table), eq(diningTables.isActive, true))),
  ]);
  if (!booking || !target) return { ok: false, reason: "That booking or table is no longer there." };
  if (booking.partySize > target.maxGuests) return { ok: false, reason: `${table} seats only ${target.maxGuests}.` };
  try {
    await db.update(bookings).set({ tableId: target.id }).where(eq(bookings.id, id));
  } catch (error) {
    if (isOverlap(error)) return { ok: false, reason: `${table} is taken at that hour.` };
    throw error;
  }
  refresh();
  return { ok: true };
}

const NewBooking = z.object({
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  table: z.string().min(1).max(8),
  partySize: z.coerce.number().int().min(1).max(12),
  name: z.string().trim().min(1, "A name for the book, please.").max(80),
  phone: z.string().trim().max(32),
  email: z.union([z.literal(""), z.email("That email doesn't look right.")]),
  notes: z.string().trim().max(500),
  source: z.enum(["phone", "walk_in"]),
});

export type NewBookingInput = z.input<typeof NewBooking>;

/** A booking taken by the house itself: a call at the desk, or guests at the door. */
export async function addBooking(input: NewBookingInput): Promise<Done> {
  const denied = await owner();
  if (denied) return denied;
  const parsed = NewBooking.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  const b = parsed.data;
  if (b.source === "phone" && !b.phone) return { ok: false, reason: "A telephone number, in case plans change." };

  const [[target], [config]] = await Promise.all([
    db.select().from(diningTables).where(eq(diningTables.label, b.table)),
    db.select({ seating: settings.seatingMinutes }).from(settings).limit(1),
  ]);
  if (!target) return { ok: false, reason: "That table is no longer there." };
  if (b.partySize > target.maxGuests) return { ok: false, reason: `${b.table} seats only ${target.maxGuests}.` };

  const startsAt = florenceInstant(b.date, b.time);
  const endsAt = new Date(startsAt.getTime() + (config?.seating ?? 120) * 60_000);
  try {
    await db.insert(bookings).values({
      tableId: target.id,
      startsAt,
      endsAt,
      partySize: b.partySize,
      guestName: b.name,
      email: b.email,
      phone: b.phone,
      notes: b.notes || null,
      source: b.source,
      status: b.source === "walk_in" ? "seated" : "confirmed",
    });
  } catch (error) {
    if (isOverlap(error)) return { ok: false, reason: `${b.table} is taken at ${b.time}.` };
    throw error;
  }
  refresh();
  return { ok: true };
}

const NewClosure = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    zone: z.enum(["sala", "galleria", "terrazza"]).nullable(),
    reason: z.string().trim().min(1, "A word for the guests: why is it closed?").max(80),
  })
  .refine((c) => c.to >= c.from, "The last day comes before the first.");

export type NewClosureInput = z.input<typeof NewClosure>;

/** Closes the house, or one room, for a day or a run of days; the booking page stops offering them at once. */
export async function addClosure(input: NewClosureInput): Promise<Done> {
  const denied = await owner();
  if (denied) return denied;
  const parsed = NewClosure.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  const { from, to, zone, reason } = parsed.data;

  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  if (dates.length > 92) return { ok: false, reason: "Three months at most in one go." };

  const [room] = zone ? await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, zone)) : [null];
  const existing = await db.select({ date: closures.date, zoneId: closures.zoneId }).from(closures).where(inArray(closures.date, dates));
  // A day already closed whole, or this room already closed that day, is left as it is.
  const fresh = dates.filter((d) => !existing.some((c) => c.date === d && (c.zoneId === null || c.zoneId === (room?.id ?? null))));
  if (!fresh.length) return { ok: false, reason: "Those days are already closed that way." };

  if (!room) {
    // Closing the whole house makes the room closures of those days redundant.
    await db.delete(closures).where(inArray(closures.date, fresh));
  }
  await db.insert(closures).values(fresh.map((date) => ({ date, zoneId: room?.id ?? null, reason })));
  updateTag("terrace");
  refresh();
  return { ok: true };
}

/** Opens again what a closure shut. */
export async function reopen(ids: number[]): Promise<Done> {
  const denied = await owner();
  if (denied) return denied;
  const list = z.array(z.number().int().positive()).min(1).max(100).parse(ids);
  await db.delete(closures).where(inArray(closures.id, list));
  updateTag("terrace");
  refresh();
  return { ok: true };
}

const MonthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Pick a day and a month.");

/** The terrace's season, the same every year: from the day the vine is dressed to the day the chairs are stacked. */
export async function setTerraceSeason(opensOn: string, closesOn: string): Promise<Done> {
  const denied = await owner();
  if (denied) return denied;
  const parsed = z.object({ opensOn: MonthDay, closesOn: MonthDay }).safeParse({ opensOn, closesOn });
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  if (parsed.data.closesOn <= parsed.data.opensOn) return { ok: false, reason: "The season has to close after it opens, in the same year." };
  await db.update(settings).set({ terraceOpensOn: parsed.data.opensOn, terraceClosesOn: parsed.data.closesOn }).where(eq(settings.id, 1));
  updateTag("terrace");
  refresh();
  return { ok: true };
}
