import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { dailyDishes, menuCategories, menuItems } from "@/db/schema";

export type MenuItem = typeof menuItems.$inferSelect;
export type MenuCategory = typeof menuCategories.$inferSelect & { items: MenuItem[] };

/** The whole menu, every season included. Invalidate with updateTag("menu"). */
export async function getMenu(): Promise<MenuCategory[]> {
  "use cache";
  cacheTag("menu");
  cacheLife("days");

  const [categories, items] = await Promise.all([
    db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder)),
    db.select().from(menuItems).orderBy(asc(menuItems.sortOrder)),
  ]);

  return categories.map((category) => ({
    ...category,
    items: items.filter((item) => item.categoryId === category.id && item.isAvailable),
  }));
}

const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const euroCents = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** €18 for whole euros, €14.50 otherwise, as a menu writes it. */
export function formatPrice(cents: number) {
  return (cents % 100 ? euroCents : euro).format(cents / 100);
}

export type DailyDish = typeof dailyDishes.$inferSelect;

/** The board by the door for one day. Invalidate with updateTag("daily"). */
export async function getDailyDishes(date: string): Promise<DailyDish[]> {
  "use cache";
  cacheTag("daily");
  cacheLife("hours");

  return db.select().from(dailyDishes).where(eq(dailyDishes.date, date)).orderBy(asc(dailyDishes.sortOrder), asc(dailyDishes.id));
}
