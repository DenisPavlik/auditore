import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Closures } from "@/components/admin/closures";
import { getClosureBook, nextMonth } from "@/lib/admin";
import { getStaff } from "@/lib/auth";
import { florenceNow } from "@/lib/booking";

export const metadata: Metadata = { title: "Chiusure" };

const LINK = "rounded-full px-3 py-1.5 font-display text-[0.68rem] tracking-[0.18em] uppercase ring-1 ring-ink/20 transition hover:bg-ink hover:text-intonaco";

async function Book({ searchParams }: { searchParams: PageProps<"/admin/chiusure">["searchParams"] }) {
  await connection();
  const query = await searchParams;
  const today = florenceNow().date;
  const picked = typeof query.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.d) && query.d >= today ? query.d : null;
  const asked = typeof query.m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.m) ? query.m : null;
  // Never further back than this month: what is gone can't be closed.
  const month = asked && asked > today.slice(0, 7) ? asked : (picked ?? today).slice(0, 7);
  const [book, staff] = await Promise.all([getClosureBook(month), getStaff()]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pb-6">
        <div>
          <p className="font-display text-xs tracking-[0.24em] text-accent-ink uppercase">Chiusure</p>
          <h1 className="mt-2 text-3xl italic sm:text-4xl">Days off and closed rooms</h1>
          <p className="mt-2 max-w-xl text-ink/70">
            A closed day or room disappears from the booking page at once; bookings already made stay in the book.
          </p>
        </div>
        <nav aria-label="Months" className="flex gap-2">
          {month > today.slice(0, 7) && (
            <Link href={`/admin/chiusure?m=${nextMonth(month, -1)}`} className={LINK} aria-label="Earlier months">
              ←
            </Link>
          )}
          <Link href={`/admin/chiusure?m=${nextMonth(month)}`} className={LINK} aria-label="Later months">
            →
          </Link>
        </nav>
      </div>
      <Closures key={month} book={book} canWrite={staff?.role === "owner"} start={picked} />
    </>
  );
}

export default function Chiusure({ searchParams }: PageProps<"/admin/chiusure">) {
  return (
    <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 pt-8 pb-24 sm:px-10">
      <div className="rounded-2xl bg-intonaco p-5 shadow-[0_30px_60px_-40px_rgb(42_32_25/0.6)] ring-1 ring-ink/10 sm:p-8">
        <Suspense fallback={<p className="text-xl text-pietra italic">Turning to the calendar…</p>}>
          <Book searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
