import "server-only";

import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { menuCategories, menuItems } from "@/db/schema";

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

const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(cents: number) {
  return euro.format(cents / 100);
}
