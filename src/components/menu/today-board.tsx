import { connection } from "next/server";

import { florenceNow } from "@/lib/booking";
import { formatPrice, getDailyDishes } from "@/lib/menu";

/** The chalkboard by the door: what the kitchen cooks today only. Nothing on it, nothing shown. */
export async function TodayBoard() {
  await connection();
  const today = florenceNow().date;
  const dishes = await getDailyDishes(today);
  if (dishes.length === 0) return null;
  const day = new Date(`${today}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <section aria-labelledby="board-title" className="relative mt-12 -rotate-[0.4deg] rounded-[6px] bg-ink px-6 py-8 text-intonaco shadow-[0_30px_60px_-35px_rgb(42_32_25/0.9)] ring-8 ring-[#6b4a2e] sm:px-12 sm:py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="board-title" className="text-3xl italic sm:text-4xl">
          Oggi in cucina
        </h2>
        <p className="font-display text-xs tracking-[0.24em] text-intonaco/60 uppercase">{day}</p>
      </div>
      <ul className="mt-6 space-y-4">
        {dishes.map((d) => (
          <li key={d.id}>
            <p className="flex items-baseline gap-3 text-2xl">
              <span className="italic">{d.name}</span>
              <span aria-hidden className="flex-1 translate-y-[-0.3em] border-b border-dotted border-intonaco/30" />
              <span className="tabular-nums">{formatPrice(d.priceCents)}</span>
            </p>
            {d.description && <p className="mt-0.5 text-lg text-intonaco/65 italic">{d.description}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-base text-intonaco/55 italic">Until the pot is empty.</p>
    </section>
  );
}
