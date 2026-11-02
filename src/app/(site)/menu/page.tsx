import type { Metadata } from "next";

import { ChapterIndex, type Chapter } from "@/components/menu/chapter-index";
import { MARKS, MenuLine } from "@/components/menu/menu-line";
import { SeasonTabs } from "@/components/menu/season-tabs";
import { SiteHeader } from "@/components/site-header";
import { getMenu, type MenuItem } from "@/lib/menu";
import { SEASON_LINES, SEASON_META, SEASONS } from "@/lib/seasons";

export const metadata: Metadata = {
  title: "La Carta",
  description:
    "The Auditore menu: Tuscan antipasti, hand-made pasta, the bistecca over oak embers, Tuscan wines, and specials that change with the season.",
};

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** Notes the kitchen has pencilled into the margin of its own menu. */
const PENCIL: Record<string, string> = {
  Ribollita: "Better on the second day, so we always make it the day before.",
  "Bistecca alla Fiorentina": "Weighed at the table, cooked only al sangue. La Volpe will not hear otherwise.",
  "Peposo dell'Impruneta": "The kiln-men of Impruneta fed this to the masons raising Brunelleschi's dome.",
  "Torta della Nonna": "The nonna in question still bakes it on Sundays.",
  "Brunello di Montalcino": "The bottle the Auditore open for weddings.",
};

/** A word after the price where the price alone would mislead. */
function priceNote(item: MenuItem, category: string) {
  if (item.tags.includes("for-two")) return "per kilo";
  if (category === "vini") return "al calice";
  return undefined;
}

export default async function MenuPage() {
  const menu = await getMenu();
  const specials = menu.find((c) => c.slug === "stagione")?.items ?? [];
  const chapters = menu.filter((c) => c.slug !== "stagione");
  const index: Chapter[] = chapters.map((c, i) => ({ slug: c.slug, numeral: NUMERALS[i], name: c.name }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 lg:max-w-[min(72rem,max(40rem,calc(100vw-2*var(--fox-room))))] px-4 pt-12 pb-28 sm:px-10 sm:pt-20">
        <header className="max-w-2xl">
          <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">La Carta</p>
          <h1 className="ink-in mt-5 text-5xl leading-[1.05] italic sm:text-7xl">Written by the calendar.</h1>
          <p className="mt-6 text-xl leading-relaxed text-ink/80">
            Tuscan cooking from the Auditore kitchen. Bread, olive oil and water are on the house; the bistecca is
            weighed at the table.
          </p>
        </header>

        <section
          aria-labelledby="specials-title"
          className="relative mt-16 overflow-hidden rounded-[4px] bg-intonaco/70 px-6 py-10 ring-1 ring-ink/10 sm:px-12 sm:py-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]"
          />
          <div className="relative flex flex-wrap items-baseline justify-between gap-4">
            <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">Speciali di Stagione</p>
            <SeasonTabs />
          </div>
          <h2 id="specials-title" className="relative mt-5 text-4xl italic sm:text-5xl">
            {SEASONS.map((season) => (
              <span key={season} data-season-only={season}>
                {SEASON_LINES[season]}
              </span>
            ))}
          </h2>
          {SEASONS.map((season) => (
            <ul key={season} data-season-only={season} className="relative mt-8 space-y-6">
              {specials
                .filter((item) => item.season === season)
                .map((item) => (
                  <MenuLine key={item.id} item={item} />
                ))}
            </ul>
          ))}
          <p className="relative mt-8 text-base text-pietra italic">
            {SEASONS.map((season) => (
              <span key={season} data-season-only={season}>
                Painted, like the rest of the house, in {SEASON_META[season].pigment}.
              </span>
            ))}
          </p>
        </section>

        <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <aside className="sticky top-0 z-10 -mx-4 bg-wash/90 px-4 pt-4 pb-2 backdrop-blur-sm sm:-mx-10 sm:px-10 lg:top-12 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <ChapterIndex chapters={index} />
          </aside>

          {/* The ruled margin of a notebook page. */}
          <div className="space-y-20 lg:border-l lg:border-accent/25 lg:pl-16">
            {chapters.map((category, i) => (
              <section
                key={category.slug}
                id={category.slug}
                aria-labelledby={`${category.slug}-title`}
                className="scroll-mt-24"
              >
                <header className="reveal flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <span aria-hidden className="font-display text-sm tracking-[0.2em] text-accent">
                    {NUMERALS[i]}
                  </span>
                  <h2 id={`${category.slug}-title`} className="text-4xl italic sm:text-5xl">
                    {category.name}
                  </h2>
                  {category.subtitle && <p className="text-lg text-pietra italic">{category.subtitle}</p>}
                </header>
                <ul className="mt-8 space-y-6">
                  {category.items.map((item) => (
                    <MenuLine
                      key={item.id}
                      item={item}
                      note={priceNote(item, category.slug)}
                      pencil={PENCIL[item.name]}
                    />
                  ))}
                </ul>
              </section>
            ))}

            <footer className="border-t border-ink/10 pt-6 text-base text-pietra italic">
              <p>
                {Object.values(MARKS).map(({ mark, label }, i) => (
                  <span key={mark}>
                    {i > 0 && " · "}
                    <span className="font-display text-[0.65rem] tracking-[0.15em] not-italic text-accent-ink">
                      {mark}
                    </span>{" "}
                    {label}
                  </span>
                ))}
              </p>
              <p className="mt-2">Tell us about any allergy when you sit down; the kitchen can change most dishes.</p>
            </footer>
          </div>
        </div>
      </main>
    </>
  );
}
