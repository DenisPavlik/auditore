"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";

import { SEASON_META, SEASONS, type Season } from "@/lib/seasons";

import { SEASON_ICONS } from "./season-icons";
import { changeSeason, useSeason } from "./use-season";

export function SeasonSwitcher() {
  const current = useSeason();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function pick(season: Season, event?: MouseEvent<HTMLButtonElement>) {
    const rect = event?.currentTarget.getBoundingClientRect();
    changeSeason(
      season,
      rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    );
  }

  // Radio-group keyboard model: arrows move and select, Tab leaves the group.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const from = current ? SEASONS.indexOf(current) : 0;
    const next = SEASONS[(from + step + SEASONS.length) % SEASONS.length];
    const button = buttons.current[SEASONS.indexOf(next)];
    button?.focus();
    const rect = button?.getBoundingClientRect();
    changeSeason(next, rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Season"
      onKeyDown={onKeyDown}
      className="flex items-center sm:gap-1"
    >
      {SEASONS.map((season, i) => {
        const Icon = SEASON_ICONS[season];
        const meta = SEASON_META[season];
        const checked = current === season;
        return (
          <button
            key={season}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${meta.label}: ${meta.pigment}`}
            title={`${meta.italian} · ${meta.pigment}`}
            tabIndex={checked || (current === null && i === 0) ? 0 : -1}
            onClick={(event) => pick(season, event)}
            className="group relative grid size-9 place-items-center sm:size-10 rounded-full text-ink/55 transition-colors duration-300 hover:text-ink aria-checked:text-accent focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span
              aria-hidden
              className="absolute inset-1 scale-50 rounded-full bg-accent/12 opacity-0 transition duration-500 group-aria-checked:scale-100 group-aria-checked:opacity-100"
            />
            <Icon className="relative size-5" />
          </button>
        );
      })}
    </div>
  );
}
