import Image from "next/image";

import { SectionHeading } from "@/components/home/section-heading";
import { HOUSE } from "@/lib/house";

// Where the painter put the house: the warm roof with the pergola just south of the Ponte Vecchio.
const PIN = { left: "42.3%", top: "57.6%" };

// The map's own paper melts into the page's at every edge.
const FADE = {
  maskImage:
    "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent), linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent)",
  maskComposite: "intersect",
} as const;

/** The way to the house, on a map drawn the way a cartographer would sketch it for a guest. */
export function HouseMap() {
  return (
    <section aria-labelledby="map-title">
      <SectionHeading id="map-title" eyebrow="Come trovarci">
        Five minutes from the Ponte Vecchio.
      </SectionHeading>
      <p className="mt-5 max-w-2xl text-xl leading-relaxed text-ink/80">
        Cross the bridge toward Palazzo Pitti, take the second lane on the left off Via de&rsquo; Guicciardini, and look
        for the vine over the door at number {HOUSE.street.split(" ").at(-1)}.
      </p>

      <figure className="reveal relative -mx-4 mt-10 sm:mx-0">
        <Image
          src="/casa/mappa.webp"
          alt="A watercolour map of central Florence: the Arno with the Ponte Vecchio, the cathedral and Palazzo Vecchio to the north, Palazzo Pitti and the Boboli gardens to the south, and the Auditore house marked in a lane just south of the old bridge."
          width={1536}
          height={1024}
          sizes="(min-width: 64rem) 60rem, 100vw"
          className="h-auto w-full"
          style={FADE}
        />
        {/* The house circled in ink, its name on a slip pinned above. */}
        <span aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2" style={PIN}>
          <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-full bg-intonaco/90 px-3 py-1 font-display text-[0.6rem] tracking-[0.22em] whitespace-nowrap text-accent-ink uppercase shadow-[0_6px_14px_-8px_rgb(42_32_25/0.6)] ring-1 ring-ink/10 sm:text-xs">
            Auditore
          </span>
          <svg viewBox="0 0 40 40" className="block size-7 text-accent sm:size-11">
            <path
              d="M21 4C11 3.5 4.5 10 4.5 20.5S12 36 21 35.5 36 28 35.5 19 28 4.5 17 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <figcaption className="mt-3 px-4 text-base text-pietra italic sm:px-0">
          {HOUSE.street}, {HOUSE.district}. The map is drawn by hand; the lanes are a little kinder than in life.
        </figcaption>
      </figure>
    </section>
  );
}
