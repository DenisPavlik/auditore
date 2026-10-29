import "server-only";

import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { galleryImages } from "@/db/schema";

export type GalleryImage = typeof galleryImages.$inferSelect;

/** Every picture in the gallery, in hanging order. Invalidate with updateTag("gallery"). */
export async function getGallery(): Promise<GalleryImage[]> {
  "use cache";
  cacheTag("gallery");
  cacheLife("days");

  return db.select().from(galleryImages).orderBy(asc(galleryImages.sortOrder));
}
