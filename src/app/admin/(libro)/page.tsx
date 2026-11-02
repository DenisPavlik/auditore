import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DayPicker } from "@/components/admin/day-picker";
import { defaultService } from "@/components/admin/service";
import { Timeline } from "@/components/admin/timeline";
import { getDayBook } from "@/lib/admin";
import { getStaff } from "@/lib/auth";
import { advanceDemoBook } from "@/lib/demo-book";
import { addDays, florenceNow } from "@/lib/booking";

const LINK = "rounded-full px-3 py-1.5 font-display text-[0.68rem] tracking-[0.18em] uppercase ring-1 ring-ink/20 transition hover:bg-ink hover:text-intonaco";

async function Day({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await connection();
  const query = await searchParams;
  const today = florenceNow().date;
  const asked = typeof query.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.d) ? query.d : null;
  // The made-up guests move along with the clock before the book is read.
  await advanceDemoBook();
  const [first, staff] = await Promise.all([getDayBook(asked ?? today), getStaff()]);
  // On a day the house rests, the book opens on the next evening it works.
  let book = first;
  for (let ahead = 1; !asked && book.services.length === 0 && ahead <= 7; ahead++) book = await getDayBook(addDays(today, ahead));
  const { date } = book;
  const service = query.s === "pranzo" || query.s === "cena" ? query.s : defaultService(book);
  const shown = new Date(`${date}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const href = (d: string, s?: string) => `/admin?d=${d}${s ? `&s=${s}` : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pb-6">
        <div>
          <p className="font-display text-xs tracking-[0.24em] text-accent-ink uppercase">
            {date === today ? "Oggi" : date < today ? "Passato" : "In arrivo"}
          </p>
          <h1 className="mt-2 text-3xl first-letter:uppercase italic sm:text-4xl">{shown}</h1>
        </div>
        <nav aria-label="Day" className="flex flex-wrap items-center gap-2">
          <Link href={href(addDays(date, -1), service)} className={LINK} aria-label="The day before">
            ←
          </Link>
          {date !== today && (
            <Link href={href(today)} className={LINK}>
              Oggi
            </Link>
          )}
          <Link href={href(addDays(date, 1), service)} className={LINK} aria-label="The day after">
            →
          </Link>
          <DayPicker date={date} />
        </nav>
      </div>
      <div role="tablist" aria-label="Service" className="mt-6 inline-flex gap-1 rounded-full bg-intonaco p-1 ring-1 ring-ink/10">
        {book.services.map((s) => (
          <Link
            key={s.service}
            role="tab"
            aria-selected={s.service === service}
            href={href(date, s.service)}
            className={`rounded-full px-5 py-1.5 font-display text-xs tracking-[0.2em] uppercase transition ${s.service === service ? "bg-ink text-intonaco" : "text-ink/70 hover:text-ink"}`}
          >
            {s.service} <span className="opacity-60">{s.opensAt}</span>
          </Link>
        ))}
      </div>
      <Timeline key={`${date}${service}`} book={book} service={service} canWrite={staff?.role === "owner"} />
    </>
  );
}

export default function Oggi({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 pt-8 pb-24 sm:px-10">
      <div className="rounded-2xl bg-intonaco p-5 shadow-[0_30px_60px_-40px_rgb(42_32_25/0.6)] ring-1 ring-ink/10 sm:p-8">
        <Suspense fallback={<p className="text-xl text-pietra italic">Turning to the day…</p>}>
          <Day searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
