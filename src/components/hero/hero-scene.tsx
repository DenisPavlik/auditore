"use client";

import { useState, useSyncExternalStore } from "react";

import { useSeason } from "@/components/season/use-season";
import type { Season } from "@/lib/seasons";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether a looping video is welcome: not with reduced motion or Save-Data. */
function useMotionAllowed() {
  return useSyncExternalStore(
    subscribeMotion,
    () => {
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      return !window.matchMedia(REDUCED_MOTION).matches && !saveData;
    },
    () => false,
  );
}

/**
 * The season's painting behind the hero. The still is a CSS background keyed
 * to html[data-season] (see .hero-poster), so it is right from the first paint
 * and only the current season's file is fetched. The living loop fades in over
 * it once it is actually playing.
 */
export function HeroScene({ className = "" }: { className?: string }) {
  const season = useSeason();
  const motionAllowed = useMotionAllowed();
  const [playing, setPlaying] = useState<Season | null>(null);

  return (
    <div aria-hidden className={`hero-scene ${className}`}>
      <div className="hero-poster absolute inset-0" />
      {season && motionAllowed && (
        <video
          key={season}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => setPlaying(season)}
          className={`absolute inset-0 size-full object-cover object-(--hero-focus) transition-opacity duration-1000 ${
            playing === season ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={`/hero/${season}.webm`} type="video/webm" />
          <source src={`/hero/${season}.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
