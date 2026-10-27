/**
 * Prepares an approved loop for the web: hides any seam left at the loop point
 * with a short crossfade, then writes MP4 (H.264), WebM (VP9) and a WebP poster.
 *
 *   bun scripts/encode-video.ts <in.mp4> <out-basename> [poster-still.png]
 *   bun scripts/encode-video.ts art/drafts/video/hero/autumn.1.mp4 public/hero/autumn art/approved/hero-autumn-16x9.png
 *
 * Needs ffmpeg, ffprobe and cwebp on PATH.
 */
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { $ } from "bun";

const [input, out, still] = process.argv.slice(2);
if (!input || !out) {
  console.error("Usage: bun scripts/encode-video.ts <in.mp4> <out-basename> [poster-still.png]");
  process.exit(1);
}

const WIDTH = 1600;
const FADE = 0.6;

const duration = Number((await $`ffprobe -v error -show_entries format=duration -of csv=p=0 ${input}`.text()).trim());
// The clip becomes: (tail crossfading into head) + middle. Its last frame is the
// frame just before the tail, so playback wraps into the crossfade without a jump.
const filter = [
  `[0]scale=${WIDTH}:-2,setsar=1,fps=24,split=3[a][b][c]`,
  `[a]trim=start=${duration - FADE},setpts=PTS-STARTPTS[tail]`,
  `[b]trim=end=${FADE},setpts=PTS-STARTPTS[head]`,
  `[c]trim=start=${FADE}:end=${duration - FADE},setpts=PTS-STARTPTS[middle]`,
  `[tail][head]xfade=transition=fade:duration=${FADE}:offset=0[seam]`,
  `[seam][middle]concat=n=2:v=1[v]`,
].join(";");

await mkdir(dirname(out), { recursive: true });
await $`ffmpeg -v error -y -i ${input} -filter_complex ${filter} -map [v] -an -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart ${out}.mp4`;
await $`ffmpeg -v error -y -i ${input} -filter_complex ${filter} -map [v] -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 ${out}.webm`;
if (still) {
  await $`cwebp -quiet -q 82 -resize ${WIDTH} 0 ${still} -o ${out}.webp`;
}
const written = [`${out}.mp4`, `${out}.webm`, ...(still ? [`${out}.webp`] : [])];
console.log((await $`ls -lh ${written}`.text()).trim());
