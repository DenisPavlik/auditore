import type { Metadata } from "next";
import Image from "next/image";

import { HouseMap } from "@/components/casa/house-map";
import { Flourish, SectionHeading } from "@/components/home/section-heading";
import { Visit } from "@/components/home/visit";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "La Casa",
  description:
    "The story of the Auditore table in the Oltrarno since 1459, the people who keep it, and how to find us: address, hours and bookings.",
};

type Entry = { year: string; title: string; text: string; picture?: { src: string; alt: string; width: number; height: number } };

// The family's own ledger, kept a line or two per century.
const CRONACA: Entry[] = [
  {
    year: "1459",
    title: "The accounts and the table",
    text: "Giovanni Auditore keeps the books for half of Florence from a house on Vicolo dell’Aquila. Clients come for a loan and stay for supper; within a year his cook is better known than his bank.",
  },
  {
    year: "1478",
    title: "A bad year for bankers",
    text: "The spring of the Pazzi conspiracy closes more than one Florentine bank, the Auditore’s among them. The kitchen keeps its fire lit and its door open, and the family learns a new trade.",
  },
  {
    year: "1740",
    title: "A door onto the lane",
    text: "The ground floor opens to the street as a trattoria for the goldsmiths, carpenters and frame-makers of the Oltrarno, who pay by the week and argue about the ribollita.",
  },
  {
    year: "1966",
    title: "The flood",
    text: "On the fourth of November the Arno climbs the lane and fills the cellar to the vault. The family carries the casks up the stairs by hand; forty days later the first pot of ribollita is back on the stove.",
    picture: { src: "/gallery/cantina.webp", alt: "The brick-vaulted cellar with its oak casks, by candlelight.", width: 1024, height: 1536 },
  },
  {
    year: "1987",
    title: "The nonna takes the kitchen",
    text: "She still rolls the pici by hand every morning and bakes the torta on Sundays. Nothing goes on the menu that she hasn’t tasted twice.",
    picture: { src: "/gallery/cucina.webp", alt: "The nonna rolling pici on a floured board in the kitchen.", width: 1024, height: 1536 },
  },
  {
    year: "2003",
    title: "Up on the roof",
    text: "The old drying loft becomes the terrace: a vine over the pergola, paper lanterns, the Duomo across the river. It opens when the evenings warm up and closes with the first cold.",
    picture: { src: "/gallery/terrazza.webp", alt: "The terrace at night under lanterns, Florence across the river.", width: 1536, height: 1024 },
  },
  {
    year: "Oggi",
    title: "Still the same table",
    text: "The menu turns with the season, the bread comes from the same oven, and La Volpe, our head waiter, has opinions about which wine you should order.",
  },
];

const PEOPLE = [
  { where: "In cucina", who: "La Nonna", text: "Rolls the pici, keeps the ragù, tastes everything twice." },
  {
    where: "Alla brace",
    who: "Lorenzo, her grandson",
    text: "Minds the oak embers and the bistecca, and will tell you, kindly but firmly, that rare is the only way.",
  },
  {
    where: "In sala",
    who: "La Volpe",
    text: "Head waiter. Knows the cellar by heart, and will soon take your booking himself.",
  },
];

export default function CasaPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-12 pb-28 sm:px-10 sm:pt-20 lg:max-w-[min(64rem,max(40rem,calc(100vw-2*var(--fox-room))))]">
        <header className="max-w-2xl">
          <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">La Casa</p>
          <h1 className="ink-in mt-5 text-5xl leading-[1.05] italic sm:text-7xl">One family, one table, since 1459.</h1>
          <p className="mt-6 text-xl leading-relaxed text-ink/80">
            A bank that became a kitchen, a kitchen that became a trattoria, and a trattoria that has fed the Oltrarno
            through floods, wars and five centuries of arguments about the ribollita.
          </p>
        </header>

        <section aria-labelledby="cronaca-title" className="mt-24">
          <SectionHeading id="cronaca-title" eyebrow="La Cronaca">
            From the family ledger.
          </SectionHeading>
          {/* Kept like the bank's old books: the year in the margin, the line beside it. */}
          <ol className="mt-12 space-y-16">
            {CRONACA.map((entry) => (
              <li
                key={entry.year}
                className="reveal grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-[7rem_minmax(0,1fr)] lg:gap-x-14"
              >
                <p className="font-display text-2xl tracking-[0.14em] text-accent sm:pt-1 sm:text-right">{entry.year}</p>
                <div className="sm:border-l sm:border-accent/25 sm:pl-10 lg:pl-14">
                  <h3 className="text-3xl italic">{entry.title}</h3>
                  <p className="mt-3 max-w-2xl text-xl leading-relaxed text-ink/80">{entry.text}</p>
                  {entry.picture && (
                    <figure
                      className={`mt-8 bg-intonaco p-2 shadow-[0_18px_34px_-22px_rgb(42_32_25/0.55)] ring-1 ring-ink/10 sm:p-3 ${
                        entry.picture.width > entry.picture.height ? "max-w-lg rotate-[0.7deg]" : "max-w-xs rotate-[-0.9deg]"
                      }`}
                    >
                      <Image
                        src={entry.picture.src}
                        alt={entry.picture.alt}
                        width={entry.picture.width}
                        height={entry.picture.height}
                        sizes="(min-width: 40rem) 32rem, 100vw"
                        className="h-auto w-full"
                      />
                    </figure>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Flourish className="my-24" />

        <section aria-labelledby="people-title">
          <SectionHeading id="people-title" eyebrow="Chi trovi">
            Who you&rsquo;ll find inside.
          </SectionHeading>
          <ul className="mt-10 grid gap-10 sm:grid-cols-3">
            {PEOPLE.map((person) => (
              <li key={person.who} className="reveal border-t border-ink/15 pt-5">
                <p className="font-display text-xs tracking-[0.24em] text-accent-ink uppercase">{person.where}</p>
                <p className="mt-3 text-2xl italic">{person.who}</p>
                <p className="mt-2 text-lg leading-relaxed text-ink/75">{person.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <Flourish className="my-24" />

        <HouseMap />

        <div className="mt-24">
          <Visit />
        </div>
      </main>
    </>
  );
}
