"use server";

import { del } from "@vercel/blob";
import { asc, eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod/v4";

import { db } from "@/db";
import { galleryImages } from "@/db/schema";
import { refuseUnlessOwner } from "@/lib/auth";

import type { Done } from "./actions";

const Words = z.object({
  title: z.string().trim().min(1, "A name for under the frame.").max(40),
  caption: z.string().trim().max(120),
  alt: z.string().trim().min(10, "Describe the picture for those who can't see it, in a sentence.").max(400),
});

/** Only pictures from the house's own Blob store hang on the wall. */
const BlobUrl = z.url().refine((u) => new URL(u).hostname.endsWith(".public.blob.vercel-storage.com"), "That picture isn't from our store.");

function galleryChanged() {
  updateTag("gallery");
  refresh();
}

export async function addPicture(input: z.input<typeof Words> & { url: string; width: number; height: number }): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const parsed = Words.extend({ url: BlobUrl, width: z.number().int().min(200).max(4000), height: z.number().int().min(200).max(4000) }).safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  const { title, caption, ...rest } = parsed.data;
  const hung = await db.select({ sortOrder: galleryImages.sortOrder }).from(galleryImages).orderBy(asc(galleryImages.sortOrder));
  await db.insert(galleryImages).values({ ...rest, title, caption: caption || null, sortOrder: (hung.at(-1)?.sortOrder ?? -1) + 1 });
  galleryChanged();
  return { ok: true };
}

export async function updatePicture(id: number, input: z.input<typeof Words>): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const parsed = Words.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
  await db
    .update(galleryImages)
    .set({ ...parsed.data, caption: parsed.data.caption || null })
    .where(eq(galleryImages.id, z.number().int().parse(id)));
  galleryChanged();
  return { ok: true };
}

/** One place earlier or later along the wall. */
export async function movePicture(id: number, by: -1 | 1): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const order = (await db.select({ id: galleryImages.id }).from(galleryImages).orderBy(asc(galleryImages.sortOrder), asc(galleryImages.id))).map((p) => p.id);
  const at = order.indexOf(z.number().int().parse(id));
  const to = at + by;
  if (at < 0 || to < 0 || to >= order.length) return { ok: true };
  [order[at], order[to]] = [order[to], order[at]];
  await Promise.all(order.map((pictureId, i) => db.update(galleryImages).set({ sortOrder: i }).where(eq(galleryImages.id, pictureId))));
  galleryChanged();
  return { ok: true };
}

/** Takes a picture down; one the owner uploaded leaves the Blob store too. */
export async function removePicture(id: number): Promise<Done> {
  const denied = await refuseUnlessOwner();
  if (denied) return denied;
  const [picture] = await db.delete(galleryImages).where(eq(galleryImages.id, z.number().int().parse(id))).returning({ url: galleryImages.url });
  if (picture && BlobUrl.safeParse(picture.url).success) await del(picture.url).catch(() => undefined);
  galleryChanged();
  return { ok: true };
}
