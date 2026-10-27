/**
 * Turns approved stills into seamless loops with fal.ai image-to-video (art/motion.ts).
 *
 *   bun scripts/animate.ts <id-or-prefix> [...more]
 *
 * The still is passed as both the first and the last frame (or the clip's
 * endImage as the last, for a move from one pose to another). Each run writes
 * art/drafts/video/<id>.<n>.mp4 and never overwrites earlier takes.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { loadEnvConfig } from "@next/env";
import { fal } from "@fal-ai/client";

import { CLIPS, type MotionClip } from "../art/motion";

loadEnvConfig(process.cwd());
fal.config({ credentials: process.env.FAL_KEY });

const DRAFTS = join(process.cwd(), "art", "drafts", "video");

// Kling names its first frame start_image_url; Seedance calls it image_url.
const FIRST_FRAME_FIELD: Record<string, string> = {
  "fal-ai/kling-video/v3/pro/image-to-video": "start_image_url",
};

async function animate(clip: MotionClip) {
  const started = Date.now();
  const upload = async (path: string) =>
    fal.storage.upload(new File([await readFile(join(process.cwd(), path))], basename(path), { type: "image/png" }));
  const imageUrl = await upload(clip.image);
  const endImageUrl = clip.endImage ? await upload(clip.endImage) : imageUrl;

  const result = await fal.subscribe(clip.endpoint, {
    input: {
      prompt: clip.prompt,
      [FIRST_FRAME_FIELD[clip.endpoint] ?? "image_url"]: imageUrl,
      end_image_url: endImageUrl,
      ...clip.input,
    },
    logs: false,
  });
  const video = (result.data as { video: { url: string } }).video;
  const bytes = Buffer.from(await (await fetch(video.url)).arrayBuffer());

  let take = 1;
  while (existsSync(join(DRAFTS, `${clip.id}.${take}.mp4`))) take++;
  const out = join(DRAFTS, `${clip.id}.${take}.mp4`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, bytes);
  console.log(`✓ ${out} (${((Date.now() - started) / 1000).toFixed(0)}s, ${result.requestId})`);
}

const selectors = process.argv.slice(2);
if (selectors.length === 0) {
  console.error("Usage: bun scripts/animate.ts <id-or-prefix> [...more]");
  process.exit(1);
}
const chosen = CLIPS.filter((c) => selectors.some((s) => c.id === s || c.id.startsWith(s)));
if (chosen.length === 0) {
  console.error(`No clips match: ${selectors.join(", ")}`);
  process.exit(1);
}

const results = await Promise.allSettled(chosen.map(animate));
for (const r of results) if (r.status === "rejected") console.error(`✗ ${r.reason?.body ? JSON.stringify(r.reason.body) : r.reason}`);
process.exit(results.some((r) => r.status === "rejected") ? 1 : 0);
