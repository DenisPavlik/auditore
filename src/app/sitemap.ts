import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/menu", priority: 0.9, changeFrequency: "daily" },
    { path: "/prenota", priority: 0.9, changeFrequency: "daily" },
    { path: "/galleria", priority: 0.6, changeFrequency: "monthly" },
    { path: "/la-casa", priority: 0.6, changeFrequency: "yearly" },
  ].map(({ path, ...rest }) => ({ url: `${SITE_URL}${path}`, ...rest }) as MetadataRoute.Sitemap[number]);
}
