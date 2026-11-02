import { z } from "zod/v4";

/** "18", "18,50" or "€ 18.5" as cents; the kitchen writes prices every way. */
export const Price = z
  .string()
  .trim()
  .transform((v) => v.replace(/[€\s]/g, "").replace(",", "."))
  .pipe(z.string().regex(/^\d{1,4}(\.\d{1,2})?$/, "A price like 18 or 18.50, please."))
  .transform((v) => Math.round(Number(v) * 100));
