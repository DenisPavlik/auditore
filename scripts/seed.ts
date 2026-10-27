/**
 * Seeds reference data: zones, floor plan, service hours, settings, menu.
 * Refuses to run while bookings exist unless called with --force,
 * because re-seeding tables cascades into bookings.
 *
 *   bun run db:seed [--force]
 */
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as s from "../src/db/schema";

loadEnvConfig(process.cwd());

const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema: s });

type Season = (typeof s.seasonEnum.enumValues)[number];

const zones = [
  {
    slug: "sala",
    name: "La Sala",
    description: "The vaulted main hall under the frescoed ceiling.",
    sortOrder: 0,
  },
  {
    slug: "galleria",
    name: "La Galleria",
    description: "A quiet row of tables along the arched windows.",
    sortOrder: 1,
  },
  {
    slug: "terrazza",
    name: "Terrazza Monteriggioni",
    description: "The garden terrace under the wisteria pergola. Open in the warm months.",
    isSeasonal: true,
    sortOrder: 2,
  },
];

// Floor plan coordinates are table centres in a 1200 x 800 plan.
type TableSeed = Omit<typeof s.diningTables.$inferInsert, "zoneId"> & { zone: string };
const tables: TableSeed[] = [
  { label: "S1", zone: "sala", minGuests: 1, maxGuests: 2, shape: "round", x: 190, y: 300, width: 70, height: 70 },
  { label: "S2", zone: "sala", minGuests: 1, maxGuests: 2, shape: "round", x: 320, y: 300, width: 70, height: 70 },
  { label: "S3", zone: "sala", minGuests: 2, maxGuests: 4, shape: "square", x: 460, y: 300, width: 84, height: 84 },
  { label: "S4", zone: "sala", minGuests: 2, maxGuests: 4, shape: "square", x: 600, y: 300, width: 84, height: 84 },
  { label: "S5", zone: "sala", minGuests: 4, maxGuests: 6, shape: "rect", x: 220, y: 440, width: 150, height: 80 },
  { label: "S6", zone: "sala", minGuests: 3, maxGuests: 5, shape: "round", x: 430, y: 440, width: 104, height: 104 },
  { label: "S7", zone: "sala", minGuests: 2, maxGuests: 4, shape: "square", x: 600, y: 440, width: 84, height: 84 },
  {
    label: "F1", zone: "sala", minGuests: 7, maxGuests: 12, shape: "rect",
    x: 410, y: 570, width: 300, height: 76, tags: ["family-table"],
  },
  { label: "B1", zone: "sala", minGuests: 3, maxGuests: 6, shape: "booth", x: 760, y: 330, width: 120, height: 110, tags: ["booth", "quiet"] },
  { label: "B2", zone: "sala", minGuests: 3, maxGuests: 6, shape: "booth", x: 760, y: 500, width: 120, height: 110, tags: ["booth", "quiet"] },
  { label: "G1", zone: "galleria", minGuests: 1, maxGuests: 2, shape: "square", x: 180, y: 690, width: 70, height: 70, tags: ["window"] },
  { label: "G2", zone: "galleria", minGuests: 1, maxGuests: 2, shape: "square", x: 310, y: 690, width: 70, height: 70, tags: ["window"] },
  { label: "G3", zone: "galleria", minGuests: 1, maxGuests: 2, shape: "square", x: 510, y: 690, width: 70, height: 70, tags: ["window"] },
  { label: "G4", zone: "galleria", minGuests: 2, maxGuests: 4, shape: "square", x: 650, y: 690, width: 84, height: 84, tags: ["window"] },
  { label: "T1", zone: "terrazza", minGuests: 1, maxGuests: 2, shape: "round", x: 960, y: 200, width: 70, height: 70, tags: ["garden"] },
  { label: "T2", zone: "terrazza", minGuests: 2, maxGuests: 4, shape: "round", x: 1090, y: 200, width: 90, height: 90, tags: ["garden"] },
  { label: "T3", zone: "terrazza", minGuests: 2, maxGuests: 4, shape: "round", x: 960, y: 360, width: 90, height: 90, tags: ["fountain-view"] },
  { label: "T4", zone: "terrazza", minGuests: 2, maxGuests: 4, shape: "round", x: 1090, y: 360, width: 90, height: 90, tags: ["fountain-view"] },
  { label: "T5", zone: "terrazza", minGuests: 4, maxGuests: 8, shape: "rect", x: 1025, y: 540, width: 220, height: 80, tags: ["pergola"] },
  { label: "T6", zone: "terrazza", minGuests: 1, maxGuests: 2, shape: "round", x: 1090, y: 690, width: 70, height: 70, tags: ["garden", "quiet"] },
];

// Closed on Mondays. Times are Europe/Rome local.
const serviceHours = [0, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, service: "pranzo" as const, opensAt: "12:30", lastSeatingAt: "14:30" },
  { weekday, service: "cena" as const, opensAt: "19:00", lastSeatingAt: "22:00" },
]);

const categories = [
  { slug: "antipasti", name: "Antipasti", subtitle: "To begin" },
  { slug: "primi", name: "Primi", subtitle: "Pasta, soups & risotti" },
  { slug: "secondi", name: "Secondi", subtitle: "From the hearth" },
  { slug: "contorni", name: "Contorni", subtitle: "On the side" },
  { slug: "dolci", name: "Dolci", subtitle: "Something sweet" },
  { slug: "stagione", name: "Speciali di Stagione", subtitle: "What the season brings" },
  { slug: "vini", name: "Vini", subtitle: "Tuscan cellar, by the glass" },
];

type ItemSeed = {
  name: string;
  description: string;
  price: number;
  tags?: string[];
  season?: Season;
};

const menu: Record<string, ItemSeed[]> = {
  antipasti: [
    { name: "Fettunta", description: "Grilled Tuscan bread, new-harvest olive oil, garlic, sea salt.", price: 8, tags: ["vegan"] },
    { name: "Crostini Toscani", description: "Chicken liver pâté with Vin Santo and capers on toasted saltless bread.", price: 12 },
    { name: "Tagliere Fiorentino", description: "Finocchiona, prosciutto toscano, pecorino di Pienza, chestnut honey, pickled vegetables.", price: 22 },
    { name: "Burrata e Pomodori Confit", description: "Burrata from Puglia, slow-roasted tomatoes, basil oil.", price: 15, tags: ["vegetarian"] },
    { name: "Carpaccio di Chianina", description: "Raw Chianina beef, wild rocket, aged parmigiano, Amalfi lemon.", price: 18, tags: ["gluten-free"] },
  ],
  primi: [
    { name: "Pappardelle al Cinghiale", description: "Wide ribbons with wild boar ragù, slow-cooked in Chianti for eight hours.", price: 22 },
    { name: "Pici Cacio e Pepe", description: "Hand-rolled Sienese pici, pecorino romano, toasted black pepper.", price: 18, tags: ["vegetarian"] },
    { name: "Ribollita", description: "Twice-boiled bread soup with cavolo nero, cannellini beans and olive oil.", price: 15, tags: ["vegan"] },
    { name: "Tortelli di Patate del Mugello", description: "Potato tortelli in brown butter and crisp sage.", price: 19, tags: ["vegetarian"] },
    { name: "Gnudi di Ricotta e Spinaci", description: "Naked ricotta and spinach dumplings, parmigiano cream, nutmeg.", price: 18, tags: ["vegetarian"] },
  ],
  secondi: [
    { name: "Bistecca alla Fiorentina", description: "Chianina T-bone over oak embers, served rare. Priced per kilo, for two or more.", price: 75, tags: ["gluten-free", "for-two"] },
    { name: "Peposo dell'Impruneta", description: "Beef shin braised in Chianti with a fistful of black pepper, as the kiln-makers of Impruneta made it.", price: 26, tags: ["gluten-free"] },
    { name: "Pollo al Mattone", description: "Half chicken pressed under a brick, rosemary and lemon.", price: 24, tags: ["gluten-free"] },
    { name: "Baccalà alla Livornese", description: "Salt cod in tomato, garlic and black olives, the Livorno way.", price: 25 },
  ],
  contorni: [
    { name: "Fagioli all'Uccelletto", description: "Cannellini beans stewed with sage, garlic and tomato.", price: 7, tags: ["vegan", "gluten-free"] },
    { name: "Patate Arrosto", description: "Roast potatoes with rosemary and whole garlic.", price: 6, tags: ["vegan", "gluten-free"] },
    { name: "Cavolo Nero Saltato", description: "Black kale sautéed with chilli and olive oil.", price: 7, tags: ["vegan", "gluten-free"] },
  ],
  dolci: [
    { name: "Cantucci e Vin Santo", description: "Almond biscotti to dip in a glass of Vin Santo del Chianti.", price: 9, tags: ["vegetarian"] },
    { name: "Schiacciata alla Fiorentina", description: "Orange-scented Florentine sponge, dusted with the city's lily.", price: 9, tags: ["vegetarian"] },
    { name: "Zuccotto", description: "Dome of sponge, ricotta, candied fruit and dark chocolate, from the Duomo's cupola.", price: 10, tags: ["vegetarian"] },
    { name: "Torta della Nonna", description: "Custard tart with pine nuts and lemon zest.", price: 9, tags: ["vegetarian"] },
  ],
  stagione: [
    { season: "autumn", name: "Tagliatelle al Tartufo Bianco", description: "Fresh egg tagliatelle, butter and shaved white truffle from San Miniato.", price: 38, tags: ["vegetarian"] },
    { season: "autumn", name: "Zuppa di Castagne", description: "Chestnut and porcini soup with rosemary oil.", price: 14, tags: ["vegan"] },
    { season: "autumn", name: "Anatra al Vin Santo e Fichi", description: "Roast duck breast, Vin Santo glaze, late figs.", price: 32, tags: ["gluten-free"] },
    { season: "autumn", name: "Castagnaccio", description: "Chestnut-flour cake with pine nuts, raisins and rosemary.", price: 9, tags: ["vegan", "gluten-free"] },
    { season: "winter", name: "Pappardelle alla Lepre", description: "Hare ragù with juniper and red wine, a hunter's winter dish.", price: 24 },
    { season: "winter", name: "Bollito Misto", description: "Slow-simmered beef and capon with salsa verde and mostarda.", price: 28, tags: ["gluten-free"] },
    { season: "winter", name: "Panforte di Siena", description: "Dense spiced cake of honey, almonds and candied citrus.", price: 9, tags: ["vegetarian"] },
    { season: "winter", name: "Vin Brulé", description: "Mulled Sangiovese with orange peel, clove and cinnamon.", price: 7, tags: ["vegan"] },
    { season: "spring", name: "Fave e Pecorino", description: "Raw young fava beans with fresh pecorino, as Tuscans eat them on the first of May.", price: 12, tags: ["vegetarian", "gluten-free"] },
    { season: "spring", name: "Risotto agli Asparagi e Limone", description: "Carnaroli with green asparagus, lemon and mascarpone.", price: 22, tags: ["vegetarian", "gluten-free"] },
    { season: "spring", name: "Agnello con Carciofi", description: "Spring lamb with braised artichokes and mint.", price: 30, tags: ["gluten-free"] },
    { season: "spring", name: "Torta di Ricotta e Fragole", description: "Baked ricotta cake with the first strawberries.", price: 10, tags: ["vegetarian"] },
    { season: "summer", name: "Panzanella", description: "Bread salad of ripe tomato, cucumber, red onion and basil.", price: 13, tags: ["vegan"] },
    { season: "summer", name: "Fiori di Zucca Fritti", description: "Courgette flowers stuffed with ricotta and anchovy, fried in a light batter.", price: 13 },
    { season: "summer", name: "Pappa al Pomodoro", description: "Tomato and bread soup, served cool with torn basil.", price: 14, tags: ["vegan"] },
    { season: "summer", name: "Gelato Fior di Latte e Basilico", description: "Sweet-milk gelato with garden basil and olive oil.", price: 8, tags: ["vegetarian", "gluten-free"] },
  ],
  vini: [
    { name: "Vernaccia di San Gimignano", description: "Crisp white from the town of towers. Almond, citrus, sea breeze.", price: 9 },
    { name: "Chianti Classico Riserva", description: "Sangiovese with cherry, violet and leather.", price: 11 },
    { name: "Vino Nobile di Montepulciano", description: "Plum, tobacco and a long, noble finish.", price: 13 },
    { name: "Brunello di Montalcino", description: "The king of Tuscany. Dark fruit, earth, spice.", price: 19 },
    { name: "Vin Santo del Chianti", description: "Amber dessert wine of dried grapes, aged in small casks.", price: 10 },
  ],
};

async function main() {
  const force = process.argv.includes("--force");
  const [{ value: bookingCount }] = await db.select({ value: count() }).from(s.bookings);
  if (bookingCount > 0 && !force) {
    console.error(`Refusing to seed: ${bookingCount} bookings exist. Re-run with --force to wipe them.`);
    process.exit(1);
  }

  await db.execute(sql`
    truncate table bookings, closures, dining_tables, zones, service_hours,
      settings, menu_items, menu_categories restart identity cascade
  `);

  const zoneRows = await db.insert(s.zones).values(zones).returning();
  const zoneId = Object.fromEntries(zoneRows.map((z) => [z.slug, z.id]));

  await db.insert(s.diningTables).values(
    tables.map(({ zone, ...t }) => ({ ...t, zoneId: zoneId[zone] })),
  );
  await db.insert(s.serviceHours).values(serviceHours);
  await db.insert(s.settings).values({ id: 1 });

  const categoryRows = await db
    .insert(s.menuCategories)
    .values(categories.map((c, i) => ({ ...c, sortOrder: i })))
    .returning();
  const categoryId = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id]));

  await db.insert(s.menuItems).values(
    Object.entries(menu).flatMap(([slug, items]) =>
      items.map((item, i) => ({
        categoryId: categoryId[slug],
        name: item.name,
        description: item.description,
        priceCents: item.price * 100,
        season: item.season ?? null,
        tags: item.tags ?? [],
        sortOrder: i,
      })),
    ),
  );

  console.log(
    `Seeded ${zoneRows.length} zones, ${tables.length} tables, ${serviceHours.length} service windows, ` +
      `${categoryRows.length} categories, ${Object.values(menu).flat().length} menu items.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
