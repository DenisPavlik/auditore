"use client";

import { useSyncExternalStore } from "react";

import { isSeason, SEASON_STORAGE_KEY, type Season } from "@/lib/seasons";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-season"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Season | null {
  const value = document.documentElement.dataset.season;
  return isSeason(value) ? value : null;
}

/** The season currently painted on the page; null during server render. */
export function useSeason() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

function applySeason(season: Season) {
  document.documentElement.dataset.season = season;
  try {
    sessionStorage.setItem(SEASON_STORAGE_KEY, season);
  } catch {
    // Private mode or blocked storage: the switch still works for this page.
  }
}

/**
 * Repaints the page in another season. Where the browser supports view
 * transitions, the new season bleeds outward from `origin` like wet paint.
 */
export function changeSeason(season: Season, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  if (root.dataset.season === season) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduceMotion) {
    applySeason(season);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  // Radius that reaches the farthest corner from the origin.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.style.setProperty("--bleed-x", `${x}px`);
  root.style.setProperty("--bleed-y", `${y}px`);
  root.style.setProperty("--bleed-r", `${radius}px`);

  document.startViewTransition(() => applySeason(season));
}
