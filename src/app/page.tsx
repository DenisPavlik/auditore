import type { CSSProperties } from "react";

import { HeroScene } from "@/components/hero/hero-scene";
import { SeasonSwitcher } from "@/components/season/season-switcher";
import { formatPrice, getMenu } from "@/lib/menu";
import { SEASON_META, SEASONS } from "@/lib/seasons";

// The living hero over the season engine. The rest of the home page (story,
// terrace status, gallery teaser, hours) arrives in phase 4.
export default async function Home() {
  const menu = await getMenu();
  const specials = menu.find((c) => c.slug === "stagione")?.items ?? [];

  return (
    <>
      <section className="relative mx-auto flex w-full max-w-[2200px] flex-col lg:min-h-svh">
        <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-5 sm:px-10">
          <div>
            <p className="font-display text-xl tracking-[0.24em] text-ink sm:text-2xl sm:tracking-[0.32em]">AUDITORE</p>
            <p className="mt-0.5 text-sm italic text-pietra">Firenze · dal 1459</p>
          </div>
          <SeasonSwitcher />
        </header>

        <div className="relative z-10 px-4 pt-10 sm:px-10 lg:flex lg:flex-1 lg:items-center lg:pt-0 lg:pb-24">
          <div className="max-w-xl lg:max-w-[min(34vw,40rem)]">
            <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">
              {SEASONS.map((season) => (
                <span key={season} data-season-only={season}>
                  {SEASON_META[season].italian} · painted in {SEASON_META[season].pigment}
                </span>
              ))}
            </p>
            <h1 className="ink-in mt-5 text-5xl leading-[1.05] text-balance italic sm:text-7xl xl:text-8xl min-[1800px]:text-[7.5rem]">
              The table changes with the season.
            </h1>
            <p
              className="ink-in mt-6 max-w-sm text-xl leading-relaxed text-ink/80"
              style={{ "--ink-delay": "700ms" } as CSSProperties}
            >
              Florentine cooking from the Auditore kitchen, on a menu that turns with the year.
            </p>
            <a
              href="#specials"
              className="mt-10 inline-flex items-center gap-3 font-display text-sm tracking-[0.22em] text-accent-ink uppercase underline decoration-accent/40 decoration-1 underline-offset-8 transition hover:decoration-accent"
            >
              This season&rsquo;s table
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* Desktop: the painting keeps its 16:9 and hangs from the right; extra width on wide screens stays paper. */}
        <HeroScene className="relative mt-10 aspect-[4/3] w-full sm:aspect-video lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-auto lg:max-w-full" />
        {/* A breath of the page's own paper behind the headline, so it reads over any season. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(42%_48%_at_20%_54%,color-mix(in_oklab,var(--wash)_88%,transparent),transparent)] lg:block"
        />
      </section>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-20 pb-24 sm:px-10">
        <section aria-labelledby="specials-title" id="specials" className="scroll-mt-10">
          <h2 id="specials-title" className="font-display text-sm tracking-[0.28em] text-pietra uppercase">
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
