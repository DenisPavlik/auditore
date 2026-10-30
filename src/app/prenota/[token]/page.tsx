import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { CancelBooking } from "@/components/booking/cancel-booking";
import { SiteHeader } from "@/components/site-header";
import { getBooking } from "@/lib/booking";
import { HOUSE } from "@/lib/house";

export const metadata: Metadata = {
  title: "Your table",
  // A guest's own booking: not for search engines.
  robots: { index: false },
};

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default function BookingPage(props: PageProps<"/prenota/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-28 sm:px-10 sm:pt-20">
        <Suspense fallback={<p className="text-xl text-pietra italic">Finding your table…</p>}>
          <Ticket params={props.params} query={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}

/** The guest's booking as a ticket from the house, with what they can still do about it. */
async function Ticket({ params, query }: { params: PageProps<"/prenota/[token]">["params"]; query: PageProps<"/prenota/[token]">["searchParams"] }) {
  await connection();
  const [{ token }, { laid }] = await Promise.all([params, query]);
  const booking = await getBooking(token);

  if (!booking) {
    return (
      <div className="max-w-xl">
        <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">Prenotazione</p>
        <h1 className="mt-5 text-5xl italic">We can&rsquo;t find that table.</h1>
        <p className="mt-6 text-xl leading-relaxed">
          The link may be incomplete. <Link href="/prenota" className="ink-link text-accent-ink">Book a table</Link>, or call us on{" "}
          <a href={`tel:${HOUSE.phone.replaceAll(" ", "")}`} className="ink-link">{HOUSE.phone}</a>.
        </p>
      </div>
    );
  }

  const first = booking.name.split(" ")[0];
  const live = booking.status === "confirmed";
  const fresh = Boolean(laid) && live;

  return (
    <div className="flex flex-col items-start gap-10">
      <div className="relative w-full max-w-xl rounded-sm bg-intonaco px-7 pt-8 pb-9 shadow-[0_24px_60px_-34px_rgb(42_32_25/0.8)] ring-1 ring-ink/15 sm:px-10">
        <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">Prenotazione</p>
        <h1 className={`mt-4 max-w-[16ch] text-4xl leading-tight italic sm:text-5xl ${fresh ? "ink-in" : ""}`}>
          {!live ? "This table was given back." : fresh ? `A table is laid for you, ${first}.` : `Your table, ${first}.`}
        </h1>
        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-ink/15 py-5 text-xl">
          <dt className="font-display text-xs leading-7 tracking-[0.22em] text-pietra uppercase">When</dt>
          <dd>
            <i>{longDate.format(new Date(`${booking.date}T12:00:00Z`))}</i>, {booking.time}
          </dd>
          <dt className="font-display text-xs leading-7 tracking-[0.22em] text-pietra uppercase">Party</dt>
          <dd>
            {booking.partySize} {booking.partySize === 1 ? "guest" : "guests"}
          </dd>
          <dt className="font-display text-xs leading-7 tracking-[0.22em] text-pietra uppercase">Table</dt>
          <dd>
            {booking.table.label}, {booking.table.zoneName}
          </dd>
          {booking.occasion && (
            <>
              <dt className="font-display text-xs leading-7 tracking-[0.22em] text-pietra uppercase">For</dt>
              <dd>{booking.occasion}</dd>
            </>
          )}
          {booking.notes && (
            <>
              <dt className="font-display text-xs leading-7 tracking-[0.22em] text-pietra uppercase">Kitchen</dt>
              <dd className="italic">&ldquo;{booking.notes}&rdquo;</dd>
            </>
          )}
        </dl>
        <span
          aria-hidden
          className={`mt-5 inline-block rounded-sm px-3 py-1 font-display text-sm tracking-[0.3em] uppercase ring-2 sm:absolute sm:top-8 sm:right-10 sm:mt-0 ${
            live ? "text-accent-ink ring-accent/70" : "text-pietra ring-pietra/60"
          } ${fresh ? "booking-stamp" : "-rotate-6"}`}
        >
          {live ? "Confermato" : "Annullato"}
        </span>

        {live && (
          <p className="mt-6 text-lg">
            {laid === "sent" ? (
              <>A letter with all of this is on its way to <i>{booking.email}</i>.</>
            ) : (
              <>Keep the link to this page: it is your key to the booking.</>
            )}
          </p>
        )}

        {live && booking.upcoming ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`/api/booking/${booking.token}/ics`}
              className="rounded-full bg-accent px-6 py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink"
            >
              Add to calendar
            </a>
            <Link
              href={`/prenota?change=${booking.token}`}
              className="rounded-full px-6 py-3 font-display text-xs tracking-[0.22em] uppercase ring-1 ring-ink/20 transition hover:ring-accent"
            >
              Change
            </Link>
            <CancelBooking token={booking.token} />
          </div>
        ) : (
          <p className="mt-6 text-lg">
            <Link href="/prenota" className="ink-link text-accent-ink">Book another table</Link>
          </p>
        )}
      </div>
      <p className="text-lg text-pietra italic">
        Until then, <Link href="/menu" className="ink-link text-accent-ink">La Carta</Link> is open for reading.
      </p>
    </div>
  );
}
