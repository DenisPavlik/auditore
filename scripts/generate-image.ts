/**
 * Generates illustrations from art/prompts.ts with OpenAI gpt-image.
 *
 *   bun scripts/generate-image.ts <id-or-prefix> [...more]
 *   bun scripts/generate-image.ts test/        # every prompt under test/
 *   IMAGE_MODEL=gpt-image-2.5-flare bun scripts/generate-image.ts test/
 *
 * Each run writes art/drafts/<id>.<n>.png and never overwrites earlier takes.
 * Prompts with a `reference` are sent to the edits endpoint with that image attached.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { loadEnvConfig } from "@next/env";

import { PROMPTS, type ImagePrompt } from "../art/prompts";

loadEnvConfig(process.cwd());

const DRAFTS = join(process.cwd(), "art", "drafts");
// 2.5 Sunburst favours fidelity over speed and, unlike gpt-image-2, renders transparent backgrounds.
const MODEL = process.env.IMAGE_MODEL ?? "gpt-image-2.5-sunburst";

async function generate(p: ImagePrompt) {
  const started = Date.now();
  const params = {
    model: MODEL,
    prompt: p.prompt,
    size: p.size,
    quality: p.quality,
    background: p.transparent ? "transparent" : "opaque",
    output_format: "png",
    n: "1",
  };
  const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };

  // A reference turns the request into an edit, so a new season keeps the approved composition.
  let res: Response;
  if (p.reference) {
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.append(key, value);
    const file = await readFile(join(process.cwd(), p.reference));
    form.append("image[]", new Blob([file], { type: "image/png" }), basename(p.reference));
    res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers, body: form });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, n: 1 }),
    });
  }
  if (!res.ok) {
    throw new Error(`${p.id}: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { b64_json: string }[] };

  let take = 1;
  while (existsSync(join(DRAFTS, `${p.id}.${take}.png`))) take++;
  const out = join(DRAFTS, `${p.id}.${take}.png`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(json.data[0].b64_json, "base64"));
  console.log(`✓ ${out} ${MODEL} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}

const selectors = process.argv.slice(2);
if (selectors.length === 0) {
  console.error("Usage: bun scripts/generate-image.ts <id-or-prefix> [...more]");
  process.exit(1);
}
const chosen = PROMPTS.filter((p) => selectors.some((s) => p.id === s || p.id.startsWith(s)));
if (chosen.length === 0) {
  console.error(`No prompts match: ${selectors.join(", ")}`);
  process.exit(1);
}

const results = await Promise.allSettled(chosen.map(generate));
for (const r of results) if (r.status === "rejected") console.error(`✗ ${r.reason}`);
process.exit(results.some((r) => r.status === "rejected") ? 1 : 0);
