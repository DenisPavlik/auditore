"use client";

import type { MouseEvent } from "react";

import { changeSeason, useSeason } from "@/components/season/use-season";
import { SEASON_META, SEASONS, type Season } from "@/lib/seasons";

/** The four seasons' specials as tabs; turning to one repaints the whole house in it. */
export function SeasonTabs() {
  const current = useSeason();

  function pick(season: Season, event: MouseEvent<HTMLButtonElement>) {
    changeSeason(season, { x: event.clientX, y: event.clientY });
  }

  return (
    <div role="group" aria-label="Season's specials" className="flex flex-wrap gap-x-6 gap-y-2">
      {SEASONS.map((season) => (
        <button
          key={season}
          type="button"
          aria-pressed={current === season}
          onClick={(event) => pick(season, event)}
          className="border-b border-transparent pb-1 font-display text-xs tracking-[0.24em] text-ink/55 uppercase transition-colors hover:text-ink aria-pressed:border-accent aria-pressed:text-accent-ink"
        >
          {SEASON_META[season].italian}
        </button>
      ))}
    </div>
  );
}
