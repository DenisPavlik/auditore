"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Loops in public/volpe/<pose>.{webm,mp4}, keyed to transparency. */
export type Pose = "benvenuto" | "ascolta" | "scrive" | "consiglia" | "pensa" | "brinda";

// What he does on his own between guests; brinda waits for a confirmed booking.
const IDLE: Pose[] = ["ascolta", "pensa", "scrive", "consiglia"];
const IDLE_MS = 11_000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
}

/**
 * Transparent video is split by engine: WebKit plays HEVC with alpha but shows
 * VP9 alpha as an opaque box; Chromium and Firefox are the other way round.
 */
function sourceFor(pose: Pose) {
  const webkit = typeof navigator !== "undefined" && navigator.vendor.startsWith("Apple");
  return webkit ? `/volpe/${pose}.mp4` : `/volpe/${pose}.webm`;
}

/**
 * La Volpe, the head waiter, standing full height at the bottom right of the
 * page. He greets the guest once, then goes about his work. Two stacked videos
 * let one pose dissolve into the next without a blank frame.
 */
export function LaVolpe() {
  const reduceMotion = useReducedMotion();
  const [layers, setLayers] = useState<[Pose, Pose | null]>(["benvenuto", null]);
  const [front, setFront] = useState<0 | 1>(0);
  const turn = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const next = IDLE[turn.current++ % IDLE.length];
      const back = front === 0 ? 1 : 0;
      setLayers((current) => {
        const updated: [Pose, Pose | null] = [...current];
        updated[back] = next;
        return updated;
      });
    }, IDLE_MS);
    return () => window.clearInterval(timer);
  }, [front, reduceMotion]);

  const pose = layers[front];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-0 bottom-0 z-20 aspect-[526/720] h-36 select-none sm:right-6 sm:h-56 lg:h-[clamp(16rem,40vh,30rem)]"
    >
      {reduceMotion ? (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed-size transparent still
        <img src={`/volpe/${pose}.webp`} alt="" className="size-full object-contain object-bottom" />
      ) : (
        layers.map((layer, i) =>
          layer ? (
            <video
              key={`${i}-${layer}`}
              src={sourceFor(layer)}
              poster={`/volpe/${layer}.webp`}
              autoPlay
              muted
              loop
              playsInline
              onPlaying={() => {
                if (i !== front) setFront(i as 0 | 1);
              }}
              className={`absolute inset-0 size-full object-contain object-bottom transition-opacity duration-700 ${
                i === front ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )
      )}
    </div>
  );
}
