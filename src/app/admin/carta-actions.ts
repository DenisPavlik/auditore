"use server";

import { asc, eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod/v4";

import { db } from "@/db";
import { dailyDishes, menuCategories, menuItems } from "@/db/schema";
import { refuseUnlessOwner } from "@/lib/auth";

import type { Done } from "./actions";

/** "18", "18,50" or "€ 18.5" as cents; the kitchen writes prices every way. */
const Price = z
  .string()
  .trim()
  .transform((v) => v.replace(/[€\s]/g, "").replace(",", "."))
  .pipe(z.string().regex(/^\d{1,4}(\.\d{1,2})?$/, "A price like 18 or 18.50, please."))
  .transform((v) => Math.round(Number(v) * 100));

const TAGS = ["vegetarian", "vegan", "gluten-free", "for-two"] as const;

const Dish = z.object({
  id: z.number().int().positive().nullable(),
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(2, "The dish needs a name.").max(60),
  description: z.string().trim().max(240),
  price: Price,
  tags: z.array(z.enum(TAGS)).max(4),
  season: z.enum(["autumn", "winter", "spring", "summer"]).nullable(),
  isAvailable: z.boolean(),
});

export type DishInput = z.input<typeof Dish>;

/** The menu changed: the menu page, the home page and La Volpe all read it again. */
function menuChanged() {
  updateTag("menu");
  refresh();
}

/** Writes a dish onto the menu, or rewrites one already there. */
export async function saveDish(input: DishInput): Promise<Done & { id?: number }> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const parsed = Dish.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  const { id, categoryId, name, description, price, tags, season, isAvailable } = parsed.data;

  const [chapter] = await db.select({ slug: menuCategories.slug }).from(menuCategories).where(eq(menuCategories.id, categoryId));
  if (!chapter) return { ok: false, reason: "That chapter of the menu is gone." };
  // Only the seasonal chapter knows seasons; the rest of the menu is there all year.
  const values = { categoryId, name, description: description || null, priceCents: price, tags, season: chapter.slug === "stagione" ? (season ?? "autumn") : null, isAvailable };

  if (id) {
    await db.update(menuItems).set(values).where(eq(menuItems.id, id));
    menuChanged();
    return { ok: true, id };
  }
  const last = await db.select({ sortOrder: menuItems.sortOrder }).from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(asc(menuItems.sortOrder));
  const [row] = await db
    .insert(menuItems)
    .values({ ...values, sortOrder: (last.at(-1)?.sortOrder ?? -1) + 1 })
    .returning({ id: menuItems.id });
  menuChanged();
  return { ok: true, id: row.id };
}

/** "Finito": off the menu for now, back with one tap. */
export async function setAvailable(id: number, isAvailable: boolean): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  await db.update(menuItems).set({ isAvailable }).where(eq(menuItems.id, z.number().int().parse(id)));
  menuChanged();
  return { ok: true };
}

/** One place up or down within its chapter. */
export async function moveDish(id: number, by: -1 | 1): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const [dish] = await db.select().from(menuItems).where(eq(menuItems.id, z.number().int().parse(id)));
  if (!dish) return { ok: false, reason: "That dish is gone." };
  // Seasonal dishes move among their own season, as the guest sees them.
  const siblings = await db
    .select({ id: menuItems.id, season: menuItems.season })
    .from(menuItems)
    .where(eq(menuItems.categoryId, dish.categoryId))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  const order = siblings.map((s) => s.id);
  const near = siblings.filter((s) => s.season === dish.season).map((s) => s.id);
  const at = near.indexOf(dish.id);
  const other = near[at + by];
  if (other === undefined) return { ok: true };
  const [a, b] = [order.indexOf(dish.id), order.indexOf(other)];
  [order[a], order[b]] = [order[b], order[a]];
  await Promise.all(order.map((dishId, i) => db.update(menuItems).set({ sortOrder: i }).where(eq(menuItems.id, dishId))));
  menuChanged();
  return { ok: true };
}

export async function deleteDish(id: number): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  await db.delete(menuItems).where(eq(menuItems.id, z.number().int().parse(id)));
  menuChanged();
  return { ok: true };
}

const Daily = z.object({
  date: z.iso.date(),
  name: z.string().trim().min(2, "The dish needs a name.").max(60),
  description: z.string().trim().max(160),
  price: Price,
});

export type DailyInput = z.input<typeof Daily>;

/** Chalks a dish on the board for one day. */
export async function addDaily(input: DailyInput): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const parsed = Daily.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  const { date, name, description, price } = parsed.data;
  const already = await db.select({ id: dailyDishes.id }).from(dailyDishes).where(eq(dailyDishes.date, date));
  if (already.length >= 6) return { ok: false, reason: "The board holds six dishes a day." };
  await db.insert(dailyDishes).values({ date, name, description: description || null, priceCents: price, sortOrder: already.length });
  updateTag("daily");
  refresh();
  return { ok: true };
}

export async function removeDaily(id: number): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  await db.delete(dailyDishes).where(eq(dailyDishes.id, z.number().int().parse(id)));
  updateTag("daily");
  refresh();
  return { ok: true };
}
