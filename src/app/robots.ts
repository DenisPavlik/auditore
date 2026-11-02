import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The back office, the API and each guest's own booking page are nobody's business but theirs.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/prenota/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
