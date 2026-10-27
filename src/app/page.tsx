import { SeasonSwitcher } from "@/components/season/season-switcher";
import { formatPrice, getMenu } from "@/lib/menu";
import { SEASON_META, SEASONS } from "@/lib/seasons";

// Foundation preview: proves the season engine and the database end to end.
// The real home page arrives in phase 4.
export default async function Home() {
  const menu = await getMenu();
  const specials = menu.find((c) => c.slug === "stagione")?.items ?? [];

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 py-5 sm:px-10">
        <div>
          <p className="font-display text-xl tracking-[0.24em] text-ink sm:text-2xl sm:tracking-[0.32em]">AUDITORE</p>
          <p className="mt-0.5 text-sm italic text-pietra">Firenze · dal 1459</p>
        </div>
        <SeasonSwitcher />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-16 pb-24 sm:px-10">
        <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">
          {SEASONS.map((season) => (
            <span key={season} data-season-only={season}>
              {SEASON_META[season].italian} · painted in {SEASON_META[season].pigment}
            </span>
          ))}
        </p>
        <h1 className="mt-5 text-5xl leading-[1.05] text-balance italic sm:text-7xl">
          The table changes with the season.
        </h1>
        <p className="mt-6 max-w-xl text-xl leading-relaxed text-ink/80">
          Florentine cooking from the Auditore kitchen, on a menu that turns with the year.
        </p>

        <section aria-labelledby="specials" className="mt-20">
          <h2 id="specials" className="font-display text-sm tracking-[0.28em] text-pietra uppercase">
            Speciali di Stagione
          </h2>
          {SEASONS.map((season) => (
            <ul key={season} data-season-only={season} className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
              {specials
                .filter((item) => item.season === season)
                .map((item) => (
                  <li key={item.id} className="flex items-baseline gap-6 py-5">
                    <div className="flex-1">
                      <p className="text-2xl">{item.name}</p>
                      <p className="mt-1 text-lg text-ink/70 italic">{item.description}</p>
                    </div>
                    <p className="text-xl text-accent-ink tabular-nums">{formatPrice(item.priceCents)}</p>
                  </li>
                ))}
            </ul>
          ))}
        </section>
      </main>

      <footer className="px-4 py-8 text-center text-sm text-pietra italic sm:px-10">
        Nulla è reale, tutto è lecito.
      </footer>
    </>
  );
}
