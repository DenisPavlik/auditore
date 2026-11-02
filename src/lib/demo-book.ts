import "server-only";

import { and, eq, gte, inArray, like, lt, lte, notInArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, closures, dailyDishes, diningTables, serviceHours, settings, zones } from "@/db/schema";

import { addDays, florenceInstant, florenceNow, weekdayOf } from "./booking";

/**
 * The house's made-up regulars, so the book is never empty when a client looks at the admin.
 * Their emails all end in DOMAIN, which is how they are told apart from real guests.
 */
const DOMAIN = "@ospiti.example";
const BEHIND = 7;
const AHEAD = 21;

const NAMES = [
  "Lucia Ferri", "Famiglia Conti", "Elena Marchetti", "James Whitaker", "Studio Brunelleschi", "Inês Duarte", "Sofia Greco",
  "Marco Bellini", "Nora Lind", "Hannah Berg", "Paolo Ricci", "Anna Novak", "Thomas Weber", "Chiara Lombardi", "Dmitri Volkov",
  "Yuki Sato", "Tom Reyes", "Giulia Rinaldi", "Olivia Bennett", "Lukas Hofmann", "Camille Laurent", "Matteo Galli", "Aiko Tanaka",
  "Famiglia Esposito", "Sara Colombo", "Daniel Novák", "Emma Johansson", "Pietro Sanna", "Clara Vidal", "Oskar Nilsson",
  "Isabella Moretti", "Henry Clarke", "Léa Martin", "Francesca Villa", "Mateo Ruiz", "Ingrid Larsen", "Davide Fontana",
  "Grace O'Neill", "Ana Kovač", "Riccardo Serra", "Mia Schneider", "Ethan Brooks", "Valentina Costa", "Jonas Berger",
  "Agnieszka Wójcik", "Leonardo Bruno", "Charlotte Dupont", "Samuel Cohen", "Beatrice Gallo", "Noah Fischer",
];

const NOTES = [
  "Nut allergy, one guest", "Vegetarian", "Gluten-free, please", "A high chair for the little one", "Window if possible",
  "Celebrating a promotion", "Shellfish allergy", "We may be ten minutes late", "Quiet table, please", "One guest uses a wheelchair",
  "Coeliac, careful with the pasta", "Bringing our own birthday cake",
];

const OCCASIONS = ["Birthday", "Anniversary", "Business dinner", "Proposal"];

/** What the nonna might chalk up on any morning. */
const BOARD = [
  { name: "Pici all'aglione", description: "Hand-rolled pici, slow garlic and tomato from Valdichiana.", price: 1600 },
  { name: "Trippa alla fiorentina", description: "Tripe stewed in tomato, finished with parmigiano.", price: 1800 },
  { name: "Pappa al pomodoro", description: "Yesterday's bread, tomato and basil, served warm.", price: 1200 },
  { name: "Cinghiale in umido", description: "Wild boar braised with olives and juniper.", price: 2600 },
  { name: "Tortelli di patate", description: "Mugello potato tortelli with butter and sage.", price: 1700 },
  { name: "Baccalà alla livornese", description: "Salt cod in a tomato and caper sauce. Fridays only, as it should be.", price: 2200 },
  { name: "Lampredotto", description: "The Florentine street classic, with salsa verde.", price: 1400 },
  { name: "Zuppa di farro", description: "Garfagnana spelt with beans and rosemary oil.", price: 1300 },
  { name: "Coniglio al finocchietto", description: "Rabbit roasted with wild fennel.", price: 2400 },
  { name: "Castagnaccio", description: "Chestnut flour cake with pine nuts and rosemary.", price: 800 },
  { name: "Crostata di ricotta", description: "Sheep's ricotta tart with a little lemon zest.", price: 900 },
  { name: "Polenta con funghi", description: "Soft polenta with porcini from the Casentino.", price: 1900 },
];

/** The same day always gets the same guests, so the book doesn't reshuffle when it is filled again. */
function randomFor(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** How full a service tends to be: busier at the weekend, thinner the further ahead. */
function appetite(date: string, service: "pranzo" | "cena", ahead: number) {
  const day = weekdayOf(date);
  const base = day === "Friday" || day === "Saturday" ? 0.78 : day === "Sunday" ? 0.62 : 0.5;
  return base * (service === "pranzo" ? 0.55 : 1) * Math.max(0.3, 1 - Math.max(0, ahead) / 28);
}

/** Books the made-up guests into every day from a week ago to three weeks ahead that has none yet. */
export async function fillDemoBook() {
  const today = florenceNow().date;
  const days = Array.from({ length: BEHIND + AHEAD + 1 }, (_, i) => addDays(today, i - BEHIND));
  const [tables, hours, [config], dayClosures, booked] = await Promise.all([
    db
      .select({ id: diningTables.id, label: diningTables.label, zone: zones.slug, zoneId: zones.id, min: diningTables.minGuests, max: diningTables.maxGuests })
      .from(diningTables)
      .innerJoin(zones, eq(diningTables.zoneId, zones.id))
      .where(eq(diningTables.isActive, true)),
    db.select().from(serviceHours),
    db.select().from(settings).limit(1),
    db.select().from(closures).where(and(gte(closures.date, days[0]), lte(closures.date, days.at(-1)!))),
    db
      .select({ tableId: bookings.tableId, startsAt: bookings.startsAt, endsAt: bookings.endsAt, email: bookings.email })
      .from(bookings)
      .where(
        and(
          gte(bookings.startsAt, florenceInstant(days[0], "00:00")),
          lt(bookings.startsAt, florenceInstant(addDays(days.at(-1)!, 1), "00:00")),
          notInArray(bookings.status, ["cancelled", "no_show"]),
        ),
      ),
  ]);
  const seating = (config?.seatingMinutes ?? 120) * 60_000;
  const rows: (typeof bookings.$inferInsert)[] = [];

  for (const date of days) {
    const dayStart = florenceInstant(date, "00:00");
    const dayEnd = florenceInstant(addDays(date, 1), "00:00");
    if (booked.some((b) => b.email.endsWith(DOMAIN) && b.startsAt >= dayStart && b.startsAt < dayEnd)) continue;
    if (dayClosures.some((c) => c.date === date && c.zoneId === null)) continue;

    const random = randomFor(date);
    const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
    const monthDay = date.slice(5);
    const terrace = monthDay >= (config?.terraceOpensOn ?? "04-15") && monthDay <= (config?.terraceClosesOn ?? "10-31");
    const ahead = Math.round((dayStart.getTime() - florenceInstant(today, "00:00").getTime()) / 86_400_000);
    // Nobody books twice on the same day.
    const guests = [...NAMES];
    const services = hours.filter((h) => h.weekday === new Date(`${date}T12:00:00Z`).getUTCDay());

    for (const h of services) {
      const opens = minutes(h.opensAt);
      const last = minutes(h.lastSeatingAt);
      const chance = appetite(date, h.service, ahead);
      for (const t of tables) {
        if (t.zone === "terrazza" && !terrace) continue;
        if (dayClosures.some((c) => c.date === date && c.zoneId === t.zoneId)) continue;
        // A first sitting early in the service, and at dinner sometimes a second once it has left.
        const turns = h.service === "cena" ? [opens, opens + 135] : [opens];
        let free = opens;
        for (const [i, earliest] of turns.entries()) {
          if (random() > chance * (i ? 0.65 : 1)) continue;
          const latest = i ? last : Math.min(last, opens + 60);
          const from = Math.max(earliest, free);
          if (from > latest) continue;
          const start = from + Math.floor((random() * (latest - from)) / 15) * 15;
          const startsAt = florenceInstant(date, clock(start));
          const endsAt = new Date(startsAt.getTime() + seating);
          const clash = booked.some((b) => b.tableId === t.id && b.startsAt < endsAt && startsAt < b.endsAt);
          free = start + seating / 60_000;
          if (clash) continue;

          const partySize = t.min + Math.floor(random() * (t.max - t.min + 1));
          // A family or a studio comes as a party, never as one.
          const fitting = guests.filter((n) => partySize >= 4 || !/^(Famiglia|Studio) /.test(n));
          const name = pick(fitting.length ? fitting : NAMES);
          if (guests.includes(name)) guests.splice(guests.indexOf(name), 1);
          const source = random() < 0.5 ? "web" : random() < 0.55 ? "volpe" : "phone";
          rows.push({
            tableId: t.id,
            startsAt,
            endsAt,
            partySize,
            guestName: name,
            email: `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}${DOMAIN}`,
            phone: `+39 3${Math.floor(10 + random() * 89)} ${Math.floor(100 + random() * 899)} ${Math.floor(1000 + random() * 8999)}`,
            notes: random() < 0.16 ? pick(NOTES) : null,
            occasion: random() < 0.1 ? pick(OCCASIONS) : null,
            source,
            // A few change their plans before the day.
            status: random() < 0.05 ? "cancelled" : "confirmed",
            createdAt: new Date(startsAt.getTime() - (1 + Math.floor(random() * 20)) * 86_400_000),
          });
        }
      }
    }
  }
  // Inserted day by day, so one table taken in the meantime spoils only its own day.
  let added = 0;
  for (const date of days) {
    const from = florenceInstant(date, "00:00");
    const to = florenceInstant(addDays(date, 1), "00:00");
    const day = rows.filter((r) => r.startsAt >= from && r.startsAt < to);
    if (!day.length) continue;
    try {
      await db.insert(bookings).values(day);
      added += day.length;
    } catch {
      // Someone real booked a table there while the day was being laid; leave that day as it is.
    }
  }
  // The chalkboard for the coming week, on the days the kitchen works and nobody has written it yet.
  const chalked = await db.selectDistinct({ date: dailyDishes.date }).from(dailyDishes).where(gte(dailyDishes.date, today));
  const board = days
    .filter((d) => d >= today && d <= addDays(today, 6))
    .filter((d) => !chalked.some((c) => c.date === d))
    .filter((d) => hours.some((h) => h.weekday === new Date(`${d}T12:00:00Z`).getUTCDay()))
    .flatMap((date) => {
      const random = randomFor(`board${date}`);
      const pool = [...BOARD];
      return Array.from({ length: 2 + Math.floor(random() * 2) }, (_, i) => {
        const dish = pool.splice(Math.floor(random() * pool.length), 1)[0];
        return { date, name: dish.name, description: dish.description, priceCents: dish.price, sortOrder: i };
      });
    });
  if (board.length) await db.insert(dailyDishes).values(board);

  await advanceDemoBook();
  return { added, chalked: board.length };
}

/**
 * The made-up guests arrive, eat and leave on their own as the clock moves,
 * and now and then one doesn't turn up.
 */
export async function advanceDemoBook() {
  const now = new Date();
  const ours = like(bookings.email, `%${DOMAIN}`);
  // One in twelve, by the booking's own id, so the same guest is always the one who didn't come.
  const absent = sql`('x' || substr(${bookings.id}::text, 1, 8))::bit(32)::int % 12 = 0`;
  await Promise.all([
    db
      .update(bookings)
      .set({ status: sql`case when ${absent} then 'no_show'::booking_status else 'completed'::booking_status end` })
      .where(and(ours, inArray(bookings.status, ["confirmed", "seated"]), lte(bookings.endsAt, now))),
    db
      .update(bookings)
      .set({ status: sql`case when ${absent} then 'no_show'::booking_status else 'seated'::booking_status end` })
      .where(and(ours, eq(bookings.status, "confirmed"), lte(bookings.startsAt, new Date(now.getTime() - 5 * 60_000)), gte(bookings.endsAt, now))),
  ]);
}
