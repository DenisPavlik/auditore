import { getHours, HOUSE } from "@/lib/house";
import { SITE_URL } from "@/lib/site";

const ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** The trattoria as search engines read it: schema.org Restaurant, with its address, hours and booking page. */
export async function RestaurantData() {
  const hours = await getHours();
  const opening = hours
    .filter((row) => row.services.length > 0)
    .flatMap((row) => {
      const [from, to = from] = row.days.split(" – ");
      const days = ORDER.slice(ORDER.indexOf(from), ORDER.indexOf(to) + 1).map((d) => `https://schema.org/${d}`);
      return row.services.map((s) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: days,
        opens: s.opensAt,
        // Last seating, plus the two hours the table is held.
        closes: `${String(Number(s.lastSeatingAt.slice(0, 2)) + 2).padStart(2, "0")}${s.lastSeatingAt.slice(2)}`,
      }));
    });

  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Auditore · Trattoria Fiorentina",
    description: "A Florentine trattoria in the Oltrarno whose menu, terrace and tables follow the seasons.",
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    telephone: HOUSE.phone,
    email: HOUSE.email,
    servesCuisine: ["Tuscan", "Italian"],
    priceRange: "€€",
    menu: `${SITE_URL}/menu`,
    acceptsReservations: `${SITE_URL}/prenota`,
    address: {
      "@type": "PostalAddress",
      streetAddress: HOUSE.street,
      addressLocality: "Firenze",
      postalCode: HOUSE.city.split(" ")[0],
      addressRegion: "FI",
      addressCountry: "IT",
    },
    openingHoursSpecification: opening,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
