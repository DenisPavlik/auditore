/** Where the site lives, for links that have to be absolute: sitemaps, cards, structured data. */
export const SITE_URL =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3210";
