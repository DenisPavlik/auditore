import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const seasonEnum = pgEnum("season", [
  "autumn",
  "winter",
  "spring",
  "summer",
]);

export const tableShapeEnum = pgEnum("table_shape", [
  "round",
  "square",
  "rect",
  "booth",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "seated",
  "completed",
  "no_show",
  "cancelled",
]);

export const bookingSourceEnum = pgEnum("booking_source", [
  "web",
  "phone",
  "walk_in",
]);

export const serviceEnum = pgEnum("service", ["pranzo", "cena"]);

/** Dining areas: La Sala, the window gallery, the seasonal Terrazza. */
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Seasonal zones (the terrace) only take bookings inside the open window. */
  isSeasonal: boolean("is_seasonal").notNull().default(false),
  sortOrder: smallint("sort_order").notNull().default(0),
});

/** A bookable table, positioned on the SVG floor plan (plan units, not px). */
export const diningTables = pgTable(
  "dining_tables",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull().unique(),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id),
    minGuests: smallint("min_guests").notNull(),
    maxGuests: smallint("max_guests").notNull(),
    shape: tableShapeEnum("shape").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    width: real("width").notNull(),
    height: real("height").notNull(),
    rotation: real("rotation").notNull().default(0),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    check("guests_range", sql`${t.minGuests} >= 1 and ${t.maxGuests} >= ${t.minGuests}`),
  ],
);

/** Weekly service windows; a weekday with no rows is closed (0 = Sunday). */
export const serviceHours = pgTable(
  "service_hours",
  {
    id: serial("id").primaryKey(),
    weekday: smallint("weekday").notNull(),
    service: serviceEnum("service").notNull(),
    opensAt: time("opens_at").notNull(),
    /** Last seating time, not the moment the kitchen closes. */
    lastSeatingAt: time("last_seating_at").notNull(),
  },
  (t) => [
    uniqueIndex("service_hours_weekday_service").on(t.weekday, t.service),
    check("weekday_range", sql`${t.weekday} between 0 and 6`),
  ],
);

/** One-off closures. With a zone set, only that zone closes (e.g. rain on the terrace). */
export const closures = pgTable(
  "closures",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    zoneId: integer("zone_id").references(() => zones.id),
    reason: text("reason"),
  },
  (t) => [index("closures_date").on(t.date)],
);

/** Singleton row of restaurant-wide settings. */
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    /** Terrace season as MM-DD, inclusive on both ends. */
    terraceOpensOn: text("terrace_opens_on").notNull().default("04-15"),
    terraceClosesOn: text("terrace_closes_on").notNull().default("10-31"),
    seatingMinutes: smallint("seating_minutes").notNull().default(120),
    slotIntervalMinutes: smallint("slot_interval_minutes").notNull().default(15),
  },
  (t) => [check("singleton", sql`${t.id} = 1`)],
);

/**
 * Overlapping bookings for the same table are rejected by an exclusion
 * constraint added in a custom migration (drizzle has no builder for it).
 */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableId: integer("table_id")
      .notNull()
      .references(() => diningTables.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    partySize: smallint("party_size").notNull(),
    guestName: text("guest_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    notes: text("notes"),
    occasion: text("occasion"),
    status: bookingStatusEnum("status").notNull().default("confirmed"),
    source: bookingSourceEnum("source").notNull().default("web"),
    manageToken: text("manage_token")
      .notNull()
      .unique()
      .default(sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bookings_starts_at").on(t.startsAt),
    check("time_order", sql`${t.endsAt} > ${t.startsAt}`),
    check("party_size_positive", sql`${t.partySize} >= 1`),
  ],
);

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  subtitle: text("subtitle"),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => menuCategories.id),
    name: text("name").notNull(),
    description: text("description"),
    /** Euro cents. */
    priceCents: integer("price_cents").notNull(),
    /** Null for the permanent menu; set for a seasonal special. */
    season: seasonEnum("season"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    illustration: text("illustration"),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [index("menu_items_category").on(t.categoryId)],
);

export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  /** The name written under the picture, e.g. "La Sala". */
  title: text("title"),
  /** One line about it, e.g. "Eight tables under the vault, laid before seven." */
  caption: text("caption"),
  alt: text("alt").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  season: seasonEnum("season"),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
