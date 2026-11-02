"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { addBooking, moveBooking, setStatus, type Done } from "@/app/admin/actions";
import type { BookEntry, BookingStatus, DayBook } from "@/lib/admin";

import { clock, minutes, windows } from "./service";

const STEP = 15;

const ROOMS = [
  { slug: "sala", name: "La Sala" },
  { slug: "galleria", name: "La Galleria" },
  { slug: "terrazza", name: "La Terrazza" },
] as const;

const SOURCE: Record<BookEntry["source"], string> = { web: "Online", volpe: "La Volpe", phone: "Telephone", walk_in: "Walk-in" };

/** What the floor calls a booking right now, which is a little more than its status. */
type Look = "expected" | "soon" | "late" | "seated" | "left" | "no-show" | "cancelled";

function lookOf(b: BookEntry, now: number | null): Look {
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "no_show") return "no-show";
  if (b.status === "seated") return "seated";
  if (b.status === "completed") return "left";
  if (now === null) return "expected";
  const start = minutes(b.start);
  if (now >= start + 10) return "late";
  return start - now <= 30 && now >= start - 30 ? "soon" : "expected";
}

const LABEL: Record<Look, string> = {
  expected: "Expected",
  soon: "Arriving",
  late: "Late",
  seated: "Seated",
  left: "Left",
  "no-show": "No-show",
  cancelled: "Cancelled",
};

const PILL: Record<Look, string> = {
  expected: "ring-1 ring-ink/25 text-ink/75",
  soon: "bg-accent text-intonaco",
  late: "bg-accent-ink text-intonaco",
  seated: "bg-ink text-intonaco",
  left: "text-pietra ring-1 ring-pietra/30",
  "no-show": "text-accent-ink ring-1 ring-accent-ink/50 line-through decoration-1",
  cancelled: "text-pietra line-through decoration-1",
};

const STRIP: Record<Look, string> = {
  expected: "bg-intonaco ring-1 ring-ink/30 text-ink",
  soon: "bg-intonaco ring-2 ring-accent text-accent-ink",
  late: "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(138_58_31/0.12)_6px_8px)] bg-intonaco ring-2 ring-accent-ink text-accent-ink",
  seated: "bg-ink text-intonaco",
  left: "bg-pietra/25 text-ink/60",
  "no-show": "bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(138_58_31/0.18)_5px_7px)] ring-1 ring-accent-ink/40 text-accent-ink line-through",
  cancelled: "hidden",
};

function Pill({ look }: { look: Look }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-display text-[0.62rem] tracking-[0.18em] whitespace-nowrap uppercase ${PILL[look]}`}>
      {LABEL[look]}
    </span>
  );
}

function useClock(book: DayBook) {
  const router = useRouter();
  const [now, setNow] = useState(book.now);
  useEffect(() => {
    // The book is read again every minute, so a booking made online appears on its own.
    const tick = setInterval(() => {
      const shown = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
      setNow(shown);
      router.refresh();
    }, 60_000);
    return () => clearInterval(tick);
  }, [router]);
  return book.date === book.today ? minutes(now) : null;
}

type Pick = { kind: "booking"; id: string } | { kind: "new"; table: string; time: string } | null;

export function Timeline({ book, service, canWrite }: { book: DayBook; service: "pranzo" | "cena"; canWrite: boolean }) {
  const clockNow = useClock(book);
  // A day gone by is read as if from its end; a day ahead has no hour yet.
  const now = book.date < book.today ? 24 * 60 : clockNow;
  const [pick, setPick] = useState<Pick>(null);
  const span = windows(book).find((s) => s.service === service);

  if (!span) {
    return <p className="mt-10 text-2xl text-pietra italic">{book.closedReason ?? `The kitchen rests on ${book.weekday}s.`}</p>;
  }

  const { from, to } = span;
  const length = to - from;
  const at = (m: number) => `${((Math.max(from, Math.min(to, m)) - from) / length) * 100}%`;
  const marks = Array.from({ length: length / 30 + 1 }, (_, i) => from + i * 30);
  const inService = book.bookings.filter((b) => minutes(b.start) >= from && minutes(b.start) < to);
  const shownNow = clockNow !== null && clockNow >= from && clockNow <= to ? clockNow : null;
  const chosen = pick?.kind === "booking" ? book.bookings.find((b) => b.id === pick.id) : undefined;

  const live = inService.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const facts = [
    [live.reduce((n, b) => n + b.partySize, 0), "covers"],
    [live.filter((b) => b.status === "seated").reduce((n, b) => n + b.partySize, 0), "at table now"],
    [live.filter((b) => b.status === "confirmed").length, "still to arrive"],
    [inService.filter((b) => b.status === "no_show").length, "no-show"],
  ] as const;
  const cancelled = inService.filter((b) => b.status === "cancelled");

  return (
    <div>
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:gap-10">
        {facts.map(([n, label]) => (
          <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd className="font-display text-3xl tabular-nums">{n}</dd>
            <dd className="text-sm text-pietra italic">{label}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="min-w-[44rem]">
            <div className="relative ml-20 h-7">
              {marks.slice(0, -1).map((m) => (
                <span key={m} className="absolute -translate-x-1/2 font-display text-xs text-pietra tabular-nums" style={{ left: at(m) }}>
                  {m % 60 === 0 ? clock(m) : "·"}
                </span>
              ))}
            </div>
            <div className="relative">
              {shownNow !== null && (
                // The hour now, drawn down through every table.
                <div className="pointer-events-none absolute inset-y-0 right-0 left-20 z-10">
                  <span className="absolute inset-y-0 w-px bg-accent" style={{ left: at(shownNow) }} />
                  <span
                    className="absolute -top-1 -translate-x-1/2 rounded-full bg-accent px-1.5 font-display text-[0.65rem] text-intonaco tabular-nums"
                    style={{ left: at(shownNow) }}
                  >
                    {clock(shownNow)}
                  </span>
                </div>
              )}
              {ROOMS.map((room) => {
                const closed = book.closedZones.includes(room.slug) || (room.slug === "terrazza" && !book.terraceSeason);
                const note = closed ? (room.slug === "terrazza" && !book.terraceSeason ? "covered until spring" : (book.closedReason ?? "closed")) : null;
                return (
                  <section key={room.slug}>
                    <h3 className="mt-4 mb-1 font-display text-[0.68rem] tracking-[0.24em] text-accent-ink uppercase">
                      {room.name}
                      {note && <span className="ml-2 font-serif text-sm tracking-normal text-pietra normal-case italic">· {note}</span>}
                    </h3>
                    {book.tables
                      .filter((t) => t.zone === room.slug)
                      .map((t) => (
                        <div key={t.label} className={`flex h-11 items-center border-b border-ink/8 ${closed ? "opacity-35" : ""}`}>
                          <span className="sticky left-0 z-20 w-20 shrink-0 bg-intonaco">
                            <span className="font-display text-sm tracking-widest">{t.label}</span>
                            <span className="ml-2 text-xs text-pietra">
                              {t.minGuests}–{t.maxGuests}
                            </span>
                          </span>
                          <span
                            className={`relative h-full flex-1 ${closed ? "" : "cursor-copy"}`}
                            onClick={(event) => {
                              if (closed) return;
                              const box = event.currentTarget.getBoundingClientRect();
                              const m = from + ((event.clientX - box.left) / box.width) * length;
                              const snapped = Math.min(minutes(span.lastSeatingAt), Math.max(minutes(span.opensAt), Math.floor(m / STEP) * STEP));
                              setPick({ kind: "new", table: t.label, time: clock(snapped) });
                            }}
                          >
                            {marks.map((m) => (
                              <span key={m} className={`absolute inset-y-0 w-px ${m % 60 ? "bg-ink/5" : "bg-ink/10"}`} style={{ left: at(m) }} />
                            ))}
                            {pick?.kind === "new" && pick.table === t.label && (
                              <span
                                className="absolute top-1.5 bottom-1.5 rounded-md border border-dashed border-accent bg-accent/10"
                                style={{ left: at(minutes(pick.time)), width: `calc(${(book.seatingMinutes / length) * 100}% - 3px)` }}
                              />
                            )}
                            {inService
                              .filter((b) => b.table === t.label)
                              .map((b) => {
                                const look = lookOf(b, now);
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setPick({ kind: "booking", id: b.id });
                                    }}
                                    title={`${b.name}, ${b.partySize} · ${b.start}–${b.end}`}
                                    className={`absolute top-1.5 bottom-1.5 flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-sm whitespace-nowrap transition hover:brightness-110 ${STRIP[look]} ${
                                      chosen?.id === b.id ? "outline-2 outline-offset-2 outline-accent" : ""
                                    }`}
                                    style={{ left: at(minutes(b.start)), width: `calc(${at(minutes(b.end))} - ${at(minutes(b.start))} - 3px)` }}
                                  >
                                    <span className="italic">{b.name}</span>
                                    <span className="opacity-70">× {b.partySize}</span>
                                    {b.occasion && <span aria-label={b.occasion}>✦</span>}
                                    {b.notes && <span aria-label="Has a note">✎</span>}
                                  </button>
                                );
                              })}
                          </span>
                        </div>
                      ))}
                  </section>
                );
              })}
            </div>
            {cancelled.length > 0 && (
              <p className="mt-4 text-sm text-pietra">
                <span className="font-display text-[0.65rem] tracking-[0.2em] uppercase">Cancelled · </span>
                {cancelled.map((b, i) => (
                  <button key={b.id} type="button" onClick={() => setPick({ kind: "booking", id: b.id })} className="italic hover:text-ink">
                    {i > 0 && ", "}
                    {b.name} ({b.table}, {b.start})
                  </button>
                ))}
              </p>
            )}
            <p className="mt-3 text-sm text-pietra italic">Tap an empty stretch of a table to write a booking there.</p>
          </div>
        </div>

        {pick && (
          <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[75svh] overflow-y-auto rounded-t-2xl bg-wash p-5 shadow-[0_-20px_50px_-30px_rgb(42_32_25/0.7)] ring-1 ring-ink/10 xl:static xl:max-h-none xl:self-start xl:rounded-xl xl:bg-wash/70 xl:shadow-none">
            {chosen ? (
              <Card key={chosen.id} booking={chosen} book={book} now={now} canWrite={canWrite} onClose={() => setPick(null)} />
            ) : pick.kind === "new" ? (
              <NewCard key={`${pick.table}${pick.time}`} book={book} table={pick.table} time={pick.time} canWrite={canWrite} onClose={() => setPick(null)} />
            ) : null}
          </aside>
        )}
      </div>
    </div>
  );
}

function Close({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-ink/10">
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

const ACTION =
  "rounded-full py-2 font-display text-[0.68rem] tracking-[0.18em] uppercase ring-1 ring-ink/25 transition enabled:hover:bg-ink enabled:hover:text-intonaco disabled:opacity-40";

function useAct(canWrite: boolean) {
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const act = (run: () => Promise<Done>, after?: () => void) =>
    start(async () => {
      setProblem(null);
      const done = await run();
      if (done.ok) after?.();
      else setProblem(done.reason);
    });
  const note = !canWrite ? "Demo: try anything, the book stays as it is." : null;
  return { pending, problem, act, note };
}

/** Which tables could take this booking instead, at its own hours. */
function freeTablesFor(b: BookEntry, book: DayBook) {
  const start = minutes(b.start);
  const end = minutes(b.end);
  return book.tables.filter(
    (t) =>
      t.label !== b.table &&
      t.maxGuests >= b.partySize &&
      !book.closedZones.includes(t.zone) &&
      (t.zone !== "terrazza" || book.terraceSeason) &&
      !book.bookings.some(
        (o) => o.id !== b.id && o.table === t.label && o.status !== "cancelled" && o.status !== "no_show" && minutes(o.start) < end && start < minutes(o.end),
      ),
  )
    // The snuggest fit first; a bigger table is there when nothing smaller is.
    .sort((x, y) => x.maxGuests - y.maxGuests || x.label.localeCompare(y.label));
}

function Card({ booking: b, book, now, canWrite, onClose }: { booking: BookEntry; book: DayBook; now: number | null; canWrite: boolean; onClose: () => void }) {
  const { pending, problem, act, note } = useAct(canWrite);
  const look = lookOf(b, now);
  const [moving, setMoving] = useState(false);
  const moves = moving ? freeTablesFor(b, book) : [];

  const actions: { label: string; status: BookingStatus }[] =
    b.status === "confirmed"
      ? [
          { label: "Seated", status: "seated" },
          { label: "No-show", status: "no_show" },
          { label: "Cancel", status: "cancelled" },
        ]
      : b.status === "seated"
        ? [
            { label: "Left", status: "completed" },
            { label: "Not yet", status: "confirmed" },
          ]
        : b.status === "completed"
          ? [{ label: "Still here", status: "seated" }]
          : [{ label: "Restore", status: "confirmed" }];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xs tracking-[0.22em] text-pietra uppercase">
            {b.table} · {b.start}–{b.end}
          </p>
          <h3 className="mt-1 text-2xl italic">{b.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Pill look={look} />
          <Close onClose={onClose} />
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-base">
        {[
          ["Guests", b.partySize],
          ["Telephone", b.phone ? <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a> : "—"],
          ["Email", b.email ? <a href={`mailto:${b.email}`} className="break-all">{b.email}</a> : "—"],
          ["Booked", `${SOURCE[b.source]}, ${new Date(`${b.bookedOn}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`],
          ...(b.occasion ? [["Occasion", b.occasion]] : []),
        ].map(([k, v]) => (
          <div key={String(k)} className="flex justify-between gap-4">
            <dt className="text-pietra">{k}</dt>
            <dd className="text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {b.notes && <p className="mt-4 border-l-2 border-accent pl-3 italic">{b.notes}</p>}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button key={a.status} type="button" disabled={pending} onClick={() => act(() => setStatus(b.id, a.status))} className={ACTION}>
            {a.label}
          </button>
        ))}
        {(b.status === "confirmed" || b.status === "seated") && (
          <button type="button" disabled={pending} onClick={() => setMoving((m) => !m)} className={`${ACTION} ${moving ? "bg-ink text-intonaco" : ""}`}>
            Move table
          </button>
        )}
      </div>

      {moving && (
        <div className="mt-4">
          <p className="text-sm text-pietra italic">{moves.length ? `Free from ${b.start} to ${b.end}:` : "No other table is free for them at that hour."}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {moves.map((t) => (
              <button
                key={t.label}
                type="button"
                disabled={pending}
                onClick={() => act(() => moveBooking(b.id, t.label), () => setMoving(false))}
                className="rounded-md px-3 py-1.5 font-display text-sm tracking-widest ring-1 ring-ink/25 transition enabled:hover:bg-ink enabled:hover:text-intonaco"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {(problem ?? note) && <p className={`mt-4 text-sm italic ${problem ? "text-accent-ink" : "text-pietra"}`}>{problem ?? note}</p>}
    </div>
  );
}

const FIELD = "w-full rounded-lg bg-intonaco px-3 py-2 text-base ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent";

function NewCard({ book, table, time, canWrite, onClose }: { book: DayBook; table: string; time: string; canWrite: boolean; onClose: () => void }) {
  const { pending, problem, act, note } = useAct(canWrite);
  const seats = book.tables.find((t) => t.label === table);
  const [source, setSource] = useState<"phone" | "walk_in">("phone");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        act(
          () =>
            addBooking({
              date: book.date,
              time: String(f.get("time")),
              table,
              partySize: String(f.get("party")),
              name: String(f.get("name")),
              phone: String(f.get("phone")),
              email: String(f.get("email")),
              notes: String(f.get("notes")),
              source,
            }),
          onClose,
        );
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.22em] text-pietra uppercase">New booking</p>
          <h3 className="mt-1 text-2xl italic">
            Table {table}
            <span className="ml-2 text-base text-pietra not-italic">
              seats {seats?.minGuests}–{seats?.maxGuests}
            </span>
          </h3>
        </div>
        <Close onClose={onClose} />
      </div>

      <div role="radiogroup" aria-label="How they came" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-intonaco p-1 ring-1 ring-ink/10">
        {(["phone", "walk_in"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={source === s}
            onClick={() => setSource(s)}
            className={`rounded-full py-1.5 font-display text-[0.68rem] tracking-[0.18em] uppercase transition ${source === s ? "bg-ink text-intonaco" : "text-ink/70"}`}
          >
            {s === "phone" ? "On the telephone" : "At the door"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-pietra">Time</span>
          <input name="time" type="time" step={STEP * 60} defaultValue={time} required className={`${FIELD} tabular-nums`} />
        </label>
        <label className="block">
          <span className="text-sm text-pietra">Guests</span>
          <input name="party" type="number" min={1} max={seats?.maxGuests ?? 12} defaultValue={seats?.minGuests ?? 2} required className={FIELD} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">Name</span>
        <input name="name" required maxLength={80} autoComplete="off" className={FIELD} />
      </label>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">Telephone{source === "walk_in" && " (if they like)"}</span>
        <input name="phone" type="tel" required={source === "phone"} maxLength={32} autoComplete="off" className={FIELD} />
      </label>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">Email (optional)</span>
        <input name="email" type="email" maxLength={120} autoComplete="off" className={FIELD} />
      </label>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">Note for the floor</span>
        <textarea name="notes" rows={2} maxLength={500} className={FIELD} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-ink py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink disabled:opacity-50"
      >
        {source === "walk_in" ? "Seat them now" : "Write it in the book"}
      </button>
      {(problem ?? note) && <p className={`mt-3 text-sm italic ${problem ? "text-accent-ink" : "text-pietra"}`}>{problem ?? note}</p>}
    </form>
  );
}
