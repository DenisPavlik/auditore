"use client";

import Image from "next/image";
import type { MouseEvent } from "react";

import { changeSeason, useSeason } from "@/components/season/use-season";
import { SEASON_META, SEASONS, type Season } from "@/lib/seasons";

/**
 * The same loggia table painted in each season. Choosing one repaints the
 * whole page in it, bleeding out from the painting that was clicked.
 */
export function FourSeasons() {
  const current = useSeason();

  function pick(season: Season, event: MouseEvent<HTMLButtonElement>) {
    changeSeason(season, { x: event.clientX, y: event.clientY });
  }

  return (
    <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {SEASONS.map((season) => {
        const meta = SEASON_META[season];
        const chosen = current === season;
        return (
          <li key={season}>
            <button
              type="button"
              aria-pressed={chosen}
              onClick={(event) => pick(season, event)}
              className="group block w-full text-left focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-[3px] shadow-[0_12px_30px_-18px_rgb(42_32_25/0.5)] ring-1 ring-ink/10">
                <Image
                  src={`/hero/${season}.webp`}
                  alt={`The loggia table in ${meta.label.toLowerCase()}`}
                  fill
                  sizes="(min-width: 64rem) 25vw, 50vw"
                  className="object-cover object-[70%_40%] transition duration-700 group-hover:scale-[1.04]"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 ring-2 ring-accent ring-inset opacity-0 transition-opacity duration-500 group-aria-pressed:opacity-100"
                />
              </span>
              <span className="mt-3 block text-2xl italic">{meta.italian}</span>
              <span className="block text-base text-pietra">{meta.pigment}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
