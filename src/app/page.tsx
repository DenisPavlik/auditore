import type { CSSProperties } from "react";

import { HeroScene } from "@/components/hero/hero-scene";
import { FourSeasons } from "@/components/home/four-seasons";
import { Flourish, SectionHeading } from "@/components/home/section-heading";
import { Terrace } from "@/components/home/terrace";
import { Visit } from "@/components/home/visit";
import { SeasonSwitcher } from "@/components/season/season-switcher";
import { formatPrice, getMenu } from "@/lib/menu";
import { SEASON_META, SEASONS, type Season } from "@/lib/seasons";

const SEASON_LINES: Record<Season, string> = {
  autumn: "What the vine and the woods bring in.",
  winter: "Slow pots for the cold months.",
  spring: "The first green things from the market.",
  summer: "Cold plates for the long evenings.",
};

// The living hero, then the house: its story, the season's specials, the same
// table through the year, the terrace today, and when and where to come.
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-24 pb-28 sm:px-10">
        <section aria-labelledby="story-title" className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-16">
          <SectionHeading id="story-title" eyebrow="La Storia">
            Bankers first, cooks ever since.
          </SectionHeading>
          <div className="space-y-5 text-xl leading-relaxed text-ink/80 lg:pt-9">
            <p>
              In 1459 Giovanni Auditore kept the accounts of half of Florence and the best table in the Oltrarno. The
              bank is long gone. The table stayed.
            </p>
            <p>
              His family still cooks what the hills around the city give each season, and nothing they don&rsquo;t:
              chestnuts and porcini when the vine turns, ribollita when the frost comes, broad beans under the wisteria,
              and in high summer whatever is ripest by noon.
            </p>
          </div>
        </section>

        <Flourish className="my-24" />

        <section aria-labelledby="specials-title" id="specials" className="scroll-mt-10">
          <SectionHeading
            id="specials-title"
            eyebrow={SEASONS.map((season) => (
              <span key={season} data-season-only={season}>
                Speciali di {SEASON_META[season].italian}
              </span>
            ))}
          >
            {SEASONS.map((season) => (
              <span key={season} data-season-only={season}>
                {SEASON_LINES[season]}
              </span>
            ))}
          </SectionHeading>
          {SEASONS.map((season) => (
            <ul key={season} data-season-only={season} className="mt-10 space-y-7">
              {specials
                .filter((item) => item.season === season)
                .map((item) => (
                  <li key={item.id}>
                    <p className="flex items-baseline gap-3 text-2xl">
                      <span>{item.name}</span>
                      {/* A dotted leader to the price, as on a written menu. */}
                      <span aria-hidden className="flex-1 translate-y-[-0.3em] border-b border-dotted border-ink/30" />
                      <span className="text-accent-ink tabular-nums">{formatPrice(item.priceCents)}</span>
                    </p>
                    <p className="mt-1 max-w-2xl text-lg text-ink/70 italic">{item.description}</p>
                  </li>
                ))}
            </ul>
          ))}
        </section>

        <Flourish className="my-24" />

        <section aria-labelledby="seasons-title">
          <SectionHeading id="seasons-title" eyebrow="Lo stesso tavolo">
            One table, four seasons.
          </SectionHeading>
          <p className="mt-5 max-w-xl text-xl leading-relaxed text-ink/80">
            The same corner of the loggia through the year. Choose one and the whole house turns with it.
          </p>
          <FourSeasons />
        </section>

        <div className="my-24">
          <Terrace />
        </div>

        <Visit />
      </main>

      <footer className="px-4 py-8 text-center text-sm text-pietra italic sm:px-10">
        Nulla è reale, tutto è lecito.
      </footer>
    </>
  );
}
