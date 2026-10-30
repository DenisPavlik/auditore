"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import type { BookReply } from "@/app/api/booking/route";
import type { DayReply } from "@/app/api/booking/day/route";
import type { CalendarDay, HeldBooking, PlanTable, ZoneSlug } from "@/lib/booking";

import { FloorPlan, TAGS, ZONES, describe, type TableState } from "./floor-plan";

const MAX_PARTY = 12;
const OCCASIONS = ["Birthday", "Anniversary", "First visit", "Business"];

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const monthOf = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const noon = (date: string) => new Date(`${date}T12:00:00Z`);
export const spellDate = (date: string) => longDate.format(noon(date));

type Day = Extract<DayReply, { open: true }>;

/** What each table is for this party at this time, with the guest's filters applied. */
function statesFor(tables: PlanTable[], day: Day | null, time: string | null, party: number, zone: ZoneSlug | null, tags: Set<string>) {
  const slot = day?.slots.find((s) => s.time === time);
  return Object.fromEntries(
    tables.map((t): [string, TableState] => {
      if (!day) return [t.label, "unfit"];
      if (day.closedZones.includes(t.zone) || (t.zone === "terrazza" && !day.terraceLaid)) return [t.label, "closed"];
      if (party < t.minGuests || party > t.maxGuests) return [t.label, "unfit"];
      if (!slot?.free.includes(t.label)) return [t.label, "taken"];
      if ((zone && t.zone !== zone) || [...tags].some((tag) => !t.tags.includes(tag))) return [t.label, "unfit"];
      return [t.label, "free"];
    }),
  );
}

/** A numbered step of the booking, in the menu's chapter style. */
function Step({ id, numeral, title, hint, children }: { id: string; numeral: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 border-t border-ink/15 pt-8">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">{numeral}</p>
        <h2 id={`${id}-title`} className="text-3xl italic sm:text-4xl">
          {title}
        </h2>
        {hint && <p className="text-lg text-pietra italic">{hint}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Chip({ on, disabled, onClick, children, label }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-lg transition disabled:cursor-not-allowed disabled:opacity-35 ${
        on ? "bg-accent text-intonaco shadow-[0_8px_18px_-12px_var(--accent)]" : "bg-intonaco/80 ring-1 ring-ink/15 hover:ring-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The booking, as one page read top to bottom: the day and the party, the hour, the table on the
 * floor plan, and the name it goes under. Each step opens once the one before it is settled.
 */
/** What the link to the page brought along: a day, a party, a time or a table to start from. */
export type Start = { date: string | null; party: number; time?: string; table?: string };

export function BookingFlow({
  tables,
  calendar,
  start,
  moving,
}: {
  tables: PlanTable[];
  calendar: CalendarDay[];
  start: Start;
  /** A booking the guest is moving to another day, hour or table. */
  moving: HeldBooking | null;
}) {
  const [date, setDate] = useState(start.date);
  const [party, setParty] = useState(start.party);
  const [day, setDay] = useState<(DayReply & { key: string }) | null>(null);
  const [time, setTime] = useState<string | null>(start.time ?? null);
  const [table, setTable] = useState<string | null>(start.table ?? null);
  const [zone, setZone] = useState<ZoneSlug | null>(null);
  const [rail, setRail] = useState<ZoneSlug>(tables.find((t) => t.label === start.table)?.zone ?? "sala");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [occasion, setOccasion] = useState<string | null>(moving?.occasion ?? null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Bumped to look at the day again, after someone else took the table.
  const [fresh, setFresh] = useState(0);
  const router = useRouter();

  // The day's free tables, again whenever the day or the party changes.
  const key = `${date}|${party}|${fresh}`;
  useEffect(() => {
    if (!date) return;
    let live = true;
    const change = moving ? `&change=${moving.token}` : "";
    void fetch(`/api/booking/day?date=${date}&party=${party}${change}`)
      .then((r) => r.json() as Promise<DayReply>)
      .then((reply) => {
        if (!live) return;
        setDay({ ...reply, key });
        // An hour the day no longer has is let go.
        const slots = reply.open ? reply.slots : [];
        setTime((current) => (current && slots.some((s) => s.time === current) ? current : null));
      });
    return () => {
      live = false;
    };
  }, [date, party, moving, key]);
  const loading = day?.key !== key;

  const open = !loading && day?.open ? day : null;
  const states = useMemo(() => statesFor(tables, open, time, party, zone, tags), [tables, open, time, party, zone, tags]);
  // A table stays chosen only while it is still free for this hour and these filters.
  const chosen = table && states[table] === "free" ? table : null;
  const chosenTable = tables.find((t) => t.label === chosen);
  // Only wishes some open table for this party could meet: no fountain while the terrace is covered.
  const offeredTags = useMemo(
    () =>
      [...new Set(tables.filter((t) => party >= t.minGuests && party <= t.maxGuests && states[t.label] !== "closed").flatMap((t) => t.tags))].filter(
        (tag) => TAGS[tag],
      ),
    [tables, party, states],
  );

  const services = open
    ? (["pranzo", "cena"] as const).map((service) => ({ service, slots: open.slots.filter((s) => s.service === service) })).filter((s) => s.slots.length)
    : [];

  function go(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function chooseForMe() {
    const best = tables
      .filter((t) => states[t.label] === "free")
      .sort((a, b) => a.maxGuests - b.maxGuests || a.label.localeCompare(b.label))[0];
    if (!best) return;
    setTable(best.label);
    setRail(best.zone);
  }

  function toggleTag(tag: string) {
    setTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !time || !chosen) return;
    const form = new FormData(event.currentTarget);
    setSending(true);
    setProblem(null);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          partySize: party,
          tableLabel: chosen,
          occasion: occasion ?? undefined,
          notes: String(form.get("notes") ?? ""),
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
          replaces: moving?.token,
        }),
      });
      const reply = (await response.json()) as BookReply;
      if (reply.ok) {
        // The booking's own page is where the guest lands, and keeps coming back to.
        router.push(`/prenota/${reply.booking.token}?laid=${reply.lettered ? "sent" : "1"}`);
        return;
      }
      setProblem(reply.reason);
      // Someone may have taken the table: look at the day again.
      if (response.status === 409) setFresh((n) => n + 1);
    } catch {
      setProblem("The line dropped. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const field =
    "w-full rounded-lg bg-intonaco/80 px-4 py-2.5 text-lg ring-1 ring-ink/15 outline-none placeholder:text-pietra/80 focus:ring-accent";

  return (
    <div className="flex flex-col gap-14">
      {moving && (
        <p className="rounded-sm bg-intonaco/80 px-5 py-4 text-lg ring-1 ring-accent/40">
          Moving your table for {moving.partySize} on <i>{spellDate(moving.date)}</i> at {moving.time}. Choose the new day, hour or table;
          the old one is given back once the new one is set.
        </p>
      )}

      <Step id="giorno" numeral="I" title="Il giorno" hint="and how many of you">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
          <div className="relative min-w-0 flex-1">
            {/* The weeks run on past the edge, fading out so it reads as more to come. */}
            <div
              className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pt-1 pb-3 [mask-image:linear-gradient(to_right,#000_85%,transparent)] [scrollbar-width:thin]"
              role="listbox"
              aria-label="Day"
            >
              {calendar.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  role="option"
                  aria-selected={d.date === date}
                  disabled={!d.open}
                  title={d.reason}
                  onClick={() => {
                    setDate(d.date);
                    setTable(null);
                  }}
                  className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-lg py-2.5 transition disabled:cursor-not-allowed ${
                    d.date === date
                      ? "bg-accent text-intonaco shadow-[0_10px_22px_-14px_var(--accent)]"
                      : d.open
                        ? "bg-intonaco/80 ring-1 ring-ink/12 hover:ring-accent/60"
                        : "text-pietra/70"
                  }`}
                >
                  <span className="font-display text-[0.65rem] tracking-[0.2em] uppercase">{i === 0 ? "Oggi" : shortDay.format(noon(d.date))}</span>
                  <span className={`text-3xl leading-tight italic ${d.open ? "" : "line-through decoration-1"}`}>{Number(d.date.slice(8))}</span>
                  <span className="text-sm leading-none italic">{d.open ? monthOf.format(noon(d.date)) : "chiuso"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="font-display text-xs tracking-[0.24em] text-pietra uppercase">Ospiti</p>
            <div className="flex items-center rounded-full bg-intonaco/80 p-1 ring-1 ring-ink/15">
              <button type="button" aria-label="One fewer" disabled={party <= 1} onClick={() => setParty(party - 1)} className="grid size-10 place-items-center rounded-full text-2xl disabled:opacity-30">
                −
              </button>
              <output aria-live="polite" className="w-12 text-center text-3xl italic">
                {party}
              </output>
              <button type="button" aria-label="One more" disabled={party >= MAX_PARTY} onClick={() => setParty(party + 1)} className="grid size-10 place-items-center rounded-full text-2xl disabled:opacity-30">
                +
              </button>
            </div>
          </div>
        </div>
        {party >= MAX_PARTY && (
          <p className="mt-3 text-lg text-pietra italic">
            More than twelve, or the whole house? <a href="tel:+390550001459" className="ink-link text-accent-ink">Call us</a> and we&rsquo;ll lay the long table.
          </p>
        )}
      </Step>

      <Step id="ora" numeral="II" title="L’ora" hint={date ? spellDate(date) : undefined}>
        {loading || !day ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="h-10 w-20 animate-pulse rounded-full bg-intonaco/50" />
            ))}
          </div>
        ) : !day.open ? (
          <p className="text-xl italic">{day.reason}</p>
        ) : services.length === 0 ? (
          <p className="text-xl italic">Every table for {party} is taken that day. Try another day, or call us: something often opens up.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {services.map(({ service, slots }) => (
              <div key={service} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="w-20 shrink-0 font-display text-xs tracking-[0.24em] text-pietra uppercase">{service}</p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <Chip
                      key={slot.time}
                      on={slot.time === time}
                      onClick={() => {
                        setTime(slot.time);
                        go("tavolo");
                      }}
                      label={`${slot.time}, ${slot.free.length} ${slot.free.length === 1 ? "table" : "tables"} free`}
                    >
                      {slot.time}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Step>

      {open && time && (
        <Step id="tavolo" numeral="III" title="Il tavolo" hint={`${time}, for ${party}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="hidden flex-wrap gap-2 sm:flex">
              <Chip on={zone === null} onClick={() => setZone(null)}>
                All rooms
              </Chip>
              {ZONES.map((z) => (
                <Chip key={z.slug} on={zone === z.slug} onClick={() => setZone(zone === z.slug ? null : z.slug)}>
                  <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: z.wash }} />
                  {z.name.replace("La ", "")}
                </Chip>
              ))}
              <span className="mx-2 h-6 w-px bg-ink/15" />
            </div>
            {offeredTags.map((tag) => (
              <Chip key={tag} on={tags.has(tag)} onClick={() => toggleTag(tag)}>
                {TAGS[tag]}
              </Chip>
            ))}
          </div>

          <div className="rounded-sm bg-intonaco/60 p-2 ring-1 ring-ink/10 sm:p-4">
            <FloorPlan
              tables={tables}
              states={states}
              chosen={chosen}
              onChoose={(label) => {
                setTable(label);
                go("nome");
              }}
              terraceLaid={open.terraceLaid}
              zone={rail}
              onZone={setRail}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg italic" aria-live="polite">
              {chosenTable ? (
                <>
                  <span className="font-display text-sm not-italic tracking-[0.2em] text-accent-ink uppercase">Tavolo {chosenTable.label}</span>{" "}
                  {describe(chosenTable, "free").split(", ").slice(1, -1).join(" · ")}, {ZONES.find((z) => z.slug === chosenTable.zone)?.name}
                </>
              ) : Object.values(states).includes("free") ? (
                "Tap a free table on the plan."
              ) : (
                "No table fits these wishes at this hour. Loosen a filter, or try another time."
              )}
            </p>
            <button type="button" onClick={chooseForMe} className="ink-link text-lg text-accent-ink italic">
              Let La Volpe choose
            </button>
          </div>
        </Step>
      )}

      {open && time && chosen && (
        <Step id="nome" numeral="IV" title="A nome di" hint="who the table is kept for">
          <form onSubmit={confirm} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-display text-xs tracking-[0.22em] text-pietra uppercase">Name</span>
                <input name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={moving?.name} className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-display text-xs tracking-[0.22em] text-pietra uppercase">Phone</span>
                <input name="phone" required type="tel" autoComplete="tel" pattern="\+?[\d\s\(\)\.\-]{6,24}" defaultValue={moving?.phone} className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-display text-xs tracking-[0.22em] text-pietra uppercase">Email</span>
                <input name="email" required type="email" autoComplete="email" defaultValue={moving?.email} className={field} />
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-display text-xs tracking-[0.22em] text-pietra uppercase">An occasion?</span>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <Chip key={o} on={occasion === o} onClick={() => setOccasion(occasion === o ? null : o)}>
                      {o}
                    </Chip>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-display text-xs tracking-[0.22em] text-pietra uppercase">For the kitchen</span>
                <textarea
                  name="notes"
                  maxLength={300}
                  rows={3}
                  defaultValue={moving?.notes}
                  placeholder="Allergies, a high chair, a surprise for the table…"
                  className={`${field} resize-none`}
                />
              </label>
            </div>

            {/* The ticket the guest is about to sign. */}
            <aside className="relative self-start rounded-sm bg-intonaco px-6 pt-6 pb-7 shadow-[0_18px_40px_-26px_rgb(42_32_25/0.8)] ring-1 ring-ink/15">
              <p className="font-display text-[0.65rem] tracking-[0.28em] text-accent-ink uppercase">Prenotazione</p>
              <p className="mt-3 text-2xl leading-tight italic">{date && spellDate(date)}</p>
              <p className="mt-1 text-xl">
                {time} · {party} {party === 1 ? "guest" : "guests"}
              </p>
              <p className="mt-1 text-lg text-pietra">
                Table {chosen}, {ZONES.find((z) => z.slug === chosenTable?.zone)?.name}
              </p>
              {occasion && <p className="mt-1 text-lg text-pietra italic">{occasion}</p>}
              {problem && (
                <p role="alert" className="mt-4 text-lg text-accent-ink">
                  {problem}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="mt-6 w-full rounded-full bg-accent px-6 py-3.5 font-display text-sm tracking-[0.22em] text-intonaco uppercase shadow-[0_10px_24px_-14px_var(--accent)] transition hover:bg-accent-ink disabled:opacity-60"
              >
                {sending ? "Un momento…" : moving ? "Move my table" : "Conferma"}
              </button>
              <p className="mt-3 text-base text-pietra italic">Free to change or cancel until the evening itself.</p>
            </aside>
          </form>
        </Step>
      )}
    </div>
  );
}
