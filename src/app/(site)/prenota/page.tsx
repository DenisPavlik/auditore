import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { BookingFlow } from "@/components/booking/booking-flow";
import { SiteHeader } from "@/components/site-header";
import { getBooking, getCalendar, getFloorPlan } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Prenota",
  description: "Book a table at Auditore: pick the day, the hour and your table on the floor plan of the hall, the galleria or the roof terrace.",
};

export default function PrenotaPage(props: PageProps<"/prenota">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-28 sm:px-10 sm:pt-20 lg:max-w-[min(72rem,max(40rem,calc(100vw-2*var(--fox-room))))]">
        <header className="max-w-2xl">
          <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">Prenota</p>
          <h1 className="ink-in mt-5 text-5xl leading-[1.05] italic sm:text-7xl">A table, laid for you.</h1>
          <p className="mt-6 text-xl leading-relaxed text-ink/80">
            Choose the evening, the hour and the very table: under the vaults, by the arched windows, or up under
            the vine while the terrace is laid. Tables are kept for two hours.
          </p>
        </header>
        <div className="mt-14">
          <Suspense fallback={<p className="text-xl text-pietra italic">Opening the book…</p>}>
            <Book query={props.searchParams} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The book itself, opened at the day and table the link asks for, if it asks. */
async function Book({ query }: { query: PageProps<"/prenota">["searchParams"] }) {
  await connection();
  const params = await query;
  const change = one(params.change);
  const [tables, calendar, moving] = await Promise.all([getFloorPlan(), getCalendar(), change ? getBooking(change) : null]);
  const held = moving?.status === "confirmed" ? moving : null;

  const asked = one(params.date);
  const party = Number(one(params.party));
  const date = held?.date ?? (calendar.find((d) => d.open && d.date === asked) ?? calendar.find((d) => d.open))?.date ?? null;
  return (
    <BookingFlow
      tables={tables}
      calendar={calendar}
      moving={held}
      start={{
        date,
        party: held?.partySize ?? (party >= 1 && party <= 12 ? party : 2),
        time: held?.time ?? one(params.time),
        table: held?.table.label ?? one(params.table),
      }}
    />
  );
}
