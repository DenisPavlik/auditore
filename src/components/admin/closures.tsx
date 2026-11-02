"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { addClosure, reopen, setTerraceSeason, type Done } from "@/app/admin/actions";
import { ZONES } from "@/components/booking/floor-plan";
import type { CalendarCell, ClosureBook, ClosureRun } from "@/lib/admin";
import type { ZoneSlug } from "@/lib/booking";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TERRACE = "#7d8a5a";

const REASONS: Record<"house" | ZoneSlug, string[]> = {
  house: ["Holiday", "Private event", "Staff training", "Repairs"],
  sala: ["Private event", "Repairs"],
  galleria: ["Private event", "Repairs"],
  terrazza: ["Rain", "Wind", "Too cold tonight", "Private event"],
};

const day = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

function span(from: string, to: string) {
  if (from === to) return day(from, { weekday: "short", day: "numeric", month: "long" });
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `${day(from, sameMonth ? { weekday: "short", day: "numeric" } : { weekday: "short", day: "numeric", month: "short" })} – ${day(to, { weekday: "short", day: "numeric", month: "long" })}`;
}

const roomName = (zone: ZoneSlug | null) => (zone ? ZONES.find((z) => z.slug === zone)!.name : "The whole house");

function useAct(canWrite: boolean) {
  const [pending, start] = useTransition();
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const act = (run: () => Promise<Done>, done: string, after?: () => void) =>
    start(async () => {
      setSaid(null);
      const result = await run();
      if (result.ok) {
        setSaid({ ok: true, text: done });
        after?.();
      } else setSaid({ ok: false, text: result.reason });
    });
  const note = canWrite ? null : "Demo: try anything, the book stays as it is.";
  return { pending, said, act, note };
}

function Said({ said, note }: { said: { ok: boolean; text: string } | null; note: string | null }) {
  const text = said?.text ?? note;
  if (!text) return null;
  return <p className={`mt-3 text-sm italic ${said && !said.ok ? "text-accent-ink" : "text-pietra"}`}>{text}</p>;
}

function Month({ month, days, today, from, to, onPick }: { month: string; days: CalendarCell[]; today: string; from: string | null; to: string | null; onPick: (date: string) => void }) {
  const lead = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <section>
      <h3 className="font-display text-sm tracking-[0.24em] uppercase">
        {MONTHS[Number(month.slice(5)) - 1]} <span className="text-pietra">{month.slice(0, 4)}</span>
      </h3>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEK.map((w) => (
          <span key={w} className="pb-1 text-center font-display text-[0.6rem] tracking-[0.16em] text-pietra uppercase">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead${i}`} />
        ))}
        {days.map((c) => {
          const past = c.date < today;
          const whole = c.closures.find((x) => x.zone === null);
          const rooms = c.closures.filter((x) => x.zone !== null);
          const picked = from !== null && c.date >= from && c.date <= (to ?? from);
          const guests = c.booked.sala + c.booked.galleria + c.booked.terrazza;
          const title = [
            day(c.date, { weekday: "long", day: "numeric", month: "long" }),
            c.rest && "the weekly day of rest",
            whole && `closed: ${whole.reason ?? "closed"}`,
            ...rooms.map((r) => `${roomName(r.zone)} closed: ${r.reason ?? ""}`),
            guests > 0 && `${guests} bookings`,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={c.date}
              type="button"
              disabled={past}
              onClick={() => onPick(c.date)}
              title={title}
              aria-pressed={picked}
              className={`relative flex aspect-square min-h-11 flex-col items-start justify-between overflow-hidden rounded-md p-1.5 text-left transition sm:p-2 ${
                past ? "opacity-35" : "hover:ring-1 hover:ring-ink/30"
              } ${picked ? "bg-wash ring-2 ring-accent" : whole ? "" : "bg-intonaco ring-1 ring-ink/8"} ${
                whole ? "bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(138_58_31/0.16)_5px_7px)] ring-1 ring-accent-ink/40" : ""
              }`}
            >
              {/* The terrace's season, as a thread of its green along the top. */}
              {c.terrace && <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: TERRACE, opacity: 0.55 }} />}
              <span className={`font-display text-sm tabular-nums ${c.rest || whole ? "text-pietra" : ""} ${c.date === today ? "underline decoration-accent decoration-2 underline-offset-4" : ""}`}>
                {Number(c.date.slice(8))}
              </span>
              <span className="flex w-full items-end justify-between gap-1">
                <span className="flex gap-0.5">
                  {rooms.map((r) => (
                    <span key={r.id} className="h-1.5 w-3 rounded-full" style={{ background: ZONES.find((z) => z.slug === r.zone)!.wash }} />
                  ))}
                </span>
                {whole ? (
                  <span className="hidden text-[0.65rem] text-accent-ink italic sm:inline">chiuso</span>
                ) : c.rest ? (
                  <span className="hidden text-[0.65rem] text-pietra italic sm:inline">riposo</span>
                ) : guests > 0 ? (
                  <span className="text-[0.65rem] text-pietra tabular-nums">{guests}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CloseForm({ book, from, to, setRange, canWrite }: { book: ClosureBook; from: string | null; to: string | null; setRange: (from: string | null, to: string | null) => void; canWrite: boolean }) {
  const [zone, setZone] = useState<ZoneSlug | null>(null);
  const [reason, setReason] = useState("");
  const { pending, said, act, note } = useAct(canWrite);
  const cells = book.months.flatMap((m) => m.days).filter((c) => from && c.date >= from && c.date <= (to ?? from));
  const touched = cells.reduce((n, c) => n + (zone ? c.booked[zone] : c.booked.sala + c.booked.galleria + c.booked.terrazza), 0);
  const terraceOpen = cells.some((c) => c.terrace);
  const last = to ?? from;

  return (
    <form
      className="rounded-xl bg-wash/70 p-5 ring-1 ring-ink/10"
      onSubmit={(event) => {
        event.preventDefault();
        if (!from) return;
        act(() => addClosure({ from, to: last!, zone, reason }), `${roomName(zone)} is closed ${from === last ? "that day" : "those days"}.`, () => {
          setRange(null, null);
          setReason("");
        });
      }}
    >
      <p className="font-display text-xs tracking-[0.22em] text-accent-ink uppercase">Close</p>
      <h3 className="mt-1 text-2xl italic">{from ? span(from, last!) : "Pick a day on the calendar"}</h3>
      {from && from === last && <p className="mt-1 text-sm text-pietra italic">Tap a later day for a run of days.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-pietra">From</span>
          <input
            type="date"
            min={book.today}
            value={from ?? ""}
            onChange={(e) => setRange(e.target.value || null, to && e.target.value > to ? null : to)}
            className="w-full rounded-lg bg-intonaco px-3 py-2 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm text-pietra">To</span>
          <input
            type="date"
            min={from ?? book.today}
            value={last ?? ""}
            onChange={(e) => setRange(from ?? e.target.value, e.target.value || null)}
            className="w-full rounded-lg bg-intonaco px-3 py-2 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>

      <div role="radiogroup" aria-label="What closes" className="mt-4 grid grid-cols-2 gap-1.5">
        {([null, "sala", "galleria", "terrazza"] as const).map((z) => {
          const off = z === "terrazza" && cells.length > 0 && !terraceOpen;
          return (
            <button
              key={z ?? "house"}
              type="button"
              role="radio"
              aria-checked={zone === z}
              disabled={off}
              onClick={() => {
                setZone(z);
                setReason("");
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left transition disabled:opacity-35 ${zone === z ? "bg-ink text-intonaco" : "bg-intonaco ring-1 ring-ink/12 enabled:hover:ring-ink/30"}`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: z ? ZONES.find((x) => x.slug === z)!.wash : "var(--accent)" }} />
              <span className="truncate">{roomName(z)}</span>
            </button>
          );
        })}
      </div>
      {cells.length > 0 && !terraceOpen && <p className="mt-2 text-sm text-pietra italic">The terrace is covered for the season on those days anyway.</p>}

      <label className="mt-4 block">
        <span className="text-sm text-pietra">Reason, as the guests will read it</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={80}
          placeholder="Closed for a private event"
          className="w-full rounded-lg bg-intonaco px-3 py-2 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REASONS[zone ?? "house"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={`rounded-full px-3 py-1 text-sm transition ${reason === r ? "bg-ink text-intonaco" : "ring-1 ring-ink/20 hover:ring-ink/40"}`}
          >
            {r}
          </button>
        ))}
      </div>

      {touched > 0 && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-sm">
          {touched === 1 ? "One booking stands" : `${touched} bookings stand`} {zone ? `in ${roomName(zone)}` : ""} on {from === last ? "that day" : "those days"}. They stay in the book:{" "}
          <Link href={`/admin?d=${from}`} className="underline decoration-accent underline-offset-2">
            move or call them
          </Link>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !from}
        className="mt-5 w-full rounded-full bg-ink py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink disabled:opacity-40"
      >
        {zone ? `Close ${roomName(zone)}` : "Close the house"}
      </button>
      <Said said={said} note={note} />
    </form>
  );
}

/** A day and a month, the same every year. */
function Pick({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <span className="flex gap-1.5" role="group" aria-label={label}>
      <select
        aria-label={`${label}: day`}
        value={value.slice(3)}
        onChange={(e) => onChange(`${value.slice(0, 2)}-${e.target.value}`)}
        className="rounded-lg bg-intonaco px-2 py-1.5 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent"
      >
        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
          <option key={d} value={d}>
            {Number(d)}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label}: month`}
        value={value.slice(0, 2)}
        onChange={(e) => onChange(`${e.target.value}-${value.slice(3)}`)}
        className="rounded-lg bg-intonaco px-2 py-1.5 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, "0")}>
            {m}
          </option>
        ))}
      </select>
    </span>
  );
}

function Season({ book, canWrite }: { book: ClosureBook; canWrite: boolean }) {
  const [opens, setOpens] = useState(book.season.opensOn);
  const [closes, setCloses] = useState(book.season.closesOn);
  const { pending, said, act, note } = useAct(canWrite);
  const now = book.today.slice(5);
  const laid = now >= book.season.opensOn && now <= book.season.closesOn;
  const spell = (md: string) => day(`2026-${md}`, { day: "numeric", month: "long" });

  return (
    <form
      className="rounded-xl bg-wash/70 p-5 ring-1 ring-ink/10"
      onSubmit={(event) => {
        event.preventDefault();
        act(() => setTerraceSeason(opens, closes), `The terrace is laid from ${spell(opens)} to ${spell(closes)}.`);
      }}
    >
      <p className="font-display text-xs tracking-[0.22em] uppercase" style={{ color: TERRACE }}>
        La Terrazza
      </p>
      <h3 className="mt-1 text-2xl italic">{laid ? `Laid until ${spell(book.season.closesOn)}` : `Covered until ${spell(book.season.opensOn)}`}</h3>
      <p className="mt-1 text-sm text-pietra">Every year, the terrace takes bookings between these two days.</p>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-pietra">Opens</span>
          <Pick value={opens} onChange={setOpens} label="Opens" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-pietra">Closes</span>
          <Pick value={closes} onChange={setCloses} label="Closes" />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending || (opens === book.season.opensOn && closes === book.season.closesOn)}
        className="mt-5 w-full rounded-full py-2.5 font-display text-xs tracking-[0.22em] uppercase ring-1 ring-ink/30 transition enabled:hover:bg-ink enabled:hover:text-intonaco disabled:opacity-40"
      >
        Keep these dates
      </button>
      <Said said={said} note={note} />
    </form>
  );
}

function Upcoming({ runs, canWrite }: { runs: ClosureRun[]; canWrite: boolean }) {
  const { pending, said, act, note } = useAct(canWrite);
  return (
    <section className="lg:col-start-1">
      <h3 className="font-display text-xs tracking-[0.24em] text-accent-ink uppercase">Coming closures</h3>
      {runs.length === 0 ? (
        <p className="mt-3 text-lg text-pietra italic">Nothing closed ahead: every working day is open.</p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
          {runs.map((r) => (
            <li key={r.ids.join()} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.zone ? ZONES.find((z) => z.slug === r.zone)!.wash : "var(--accent)" }} />
                <span className="min-w-0">
                  <span className="block text-lg italic">{span(r.from, r.to)}</span>
                  <span className="text-sm text-pietra">
                    {roomName(r.zone)}
                    {r.reason && ` · ${r.reason}`}
                  </span>
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => reopen(r.ids), `${roomName(r.zone)} opens again ${r.from === r.to ? "that day" : "those days"}.`)}
                className="rounded-full px-4 py-1.5 font-display text-[0.68rem] tracking-[0.18em] uppercase ring-1 ring-ink/25 transition enabled:hover:bg-ink enabled:hover:text-intonaco disabled:opacity-40"
              >
                Open again
              </button>
            </li>
          ))}
        </ul>
      )}
      <Said said={said} note={note} />
    </section>
  );
}

export function Closures({ book, canWrite, start }: { book: ClosureBook; canWrite: boolean; start: string | null }) {
  const [from, setFrom] = useState<string | null>(start);
  const [to, setTo] = useState<string | null>(null);
  const setRange = (f: string | null, t: string | null) => {
    setFrom(f);
    setTo(t && f && t > f ? t : null);
  };
  // A first tap picks a day, a later one stretches it into a run, the next starts again.
  const pick = (date: string) => (from && !to && date > from ? setRange(from, date) : setRange(date, null));

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr]">
      <div>
        <div className="grid gap-10 md:grid-cols-2">
          {book.months.map((m, i) => (
            // A phone shows one month at a time, so the form stays close under it.
            <div key={m.month} className={i ? "hidden md:block" : ""}>
              <Month month={m.month} days={m.days} today={book.today} from={from} to={to} onPick={pick} />
            </div>
          ))}
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-pietra">
          <li className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-sm bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(138_58_31/0.3)_3px_5px)] ring-1 ring-accent-ink/40" />
            house closed
          </li>
          {ZONES.map((z) => (
            <li key={z.slug} className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full" style={{ background: z.wash }} />
              {z.name} closed
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="h-[3px] w-5" style={{ background: TERRACE, opacity: 0.55 }} />
            terrace season
          </li>
          <li>
            <span className="tabular-nums">12</span> bookings that day
          </li>
        </ul>
      </div>
      <div className="space-y-6 lg:sticky lg:top-6 lg:row-span-2 lg:self-start">
        <CloseForm book={book} from={from} to={to} setRange={setRange} canWrite={canWrite} />
        <Season book={book} canWrite={canWrite} />
      </div>
      <Upcoming runs={book.upcoming} canWrite={canWrite} />
    </div>
  );
}
