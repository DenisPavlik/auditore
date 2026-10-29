/**
 * Fills the gallery with the paintings in public/gallery/ (made from the
 * galleria/ prompts and scripts/compose-gallery.py). Replaces whatever the
 * gallery held, so run it again after adding a picture here.
 *
 *   bun scripts/seed-gallery.ts
 */
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as s from "../src/db/schema";

loadEnvConfig(process.cwd());

const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema: s });

type Picture = { file: string; title: string; caption: string; alt: string; width: number; height: number };

const WIDE = { width: 1536, height: 1024 };
const TALL = { width: 1024, height: 1536 };
const SQUARE = { width: 1024, height: 1024 };

// Hung in this order, row by row: a landscape beside a portrait, swapping sides, then two squares.
const pictures: Picture[] = [
  {
    file: "sala",
    title: "La Sala",
    caption: "Eight tables under the vault, laid before seven.",
    alt: "Watercolour of the trattoria's vaulted dining room seen from the door: white-clothed tables with candles and Chianti flasks, copper lamps, a faded fresco of a vine and a bird, the blue evening street through an arched window.",
    ...WIDE,
  },
  {
    file: "cucina",
    title: "La Cucina",
    caption: "The nonna rolls the pici by hand every morning.",
    alt: "An old Tuscan grandmother in a flowered apron rolling thick pici pasta on a floured board, copper pans, garlic and chillies hanging behind her, ragù simmering on the stove.",
    ...TALL,
  },
  {
    file: "gatto",
    title: "Il Gatto",
    caption: "He keeps the window. Please don't wake him.",
    alt: "A ginger cat asleep on a stone windowsill between pots of basil and a lemon tree, a narrow Oltrarno street with laundry lines and a parked Vespa below, the cathedral dome beyond.",
    ...TALL,
  },
  {
    file: "bistecca",
    title: "Bistecca alla fiorentina",
    caption: "Over oak embers, by the kilo, served rare.",
    alt: "A thick T-bone steak seared dark and sliced rare on an olive-wood board beside a grill over glowing embers, with rosemary, coarse salt, olive oil, lemon and a glass of red wine.",
    ...WIDE,
  },
  {
    file: "terrazza",
    title: "La Terrazza",
    caption: "Summer nights under the vine, the Duomo across the river.",
    alt: "The terrace at night under a vine pergola hung with paper lanterns, guests at candlelit tables, a waiter carrying plates, Florence and the lit cathedral across the Arno.",
    ...WIDE,
  },
  {
    file: "cantina",
    title: "La Cantina",
    caption: "Chianti and Brunello resting under the house.",
    alt: "A brick-vaulted wine cellar lined with oak casks and dusty bottle racks, a straw-wrapped flask and a glass of red wine on the nearest cask by candle and lantern light.",
    ...TALL,
  },
  {
    file: "pane",
    title: "Fettunta",
    caption: "Grilled bread, a rub of garlic, this year's oil.",
    alt: "Hands pouring green olive oil from a tin over slices of charred Tuscan bread on a wooden board, with tomatoes, garlic, basil and coarse salt.",
    ...SQUARE,
  },
  {
    file: "dolci",
    title: "Torta della nonna",
    caption: "With vin santo and cantucci, to finish.",
    alt: "A slice of custard tart topped with pine nuts and powdered sugar on a blue-painted plate, a glass of amber vin santo, almond cantucci and a small espresso on white linen.",
    ...SQUARE,
  },
];

await db.execute(sql`truncate table gallery_images restart identity`);
await db
  .insert(s.galleryImages)
  .values(pictures.map(({ file, ...picture }, i) => ({ ...picture, url: `/gallery/${file}.webp`, sortOrder: i })));
console.log(`Seeded ${pictures.length} gallery pictures.`);
