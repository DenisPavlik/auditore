"use client";

import { useEffect, useRef, useState } from "react";

import { volpe } from "./volpe-store";

/** Same split as the moves: WebKit plays HEVC with alpha, everyone else VP9 alpha. */
function source() {
  return `/volpe/peek/sbircia.${navigator.vendor.startsWith("Apple") ? "mp4" : "webm"}`;
}

/**
 * On a phone La Volpe waits behind the right edge of the screen and peeks out,
 * holding on to the edge of the page. Now and then he asks whether you need
 * help; a tap brings him out to his desk. While the page scrolls he ducks back
 * so he never sits on what you are reading.
 */
export function VolpePeek() {
  const video = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);
  const [ducked, setDucked] = useState(false);
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(volpe.get().open);

  useEffect(() => volpe.subscribe(() => setOpen(volpe.get().open)), []);

  useEffect(() => {
    const el = video.current!;
    el.src = source();
    void el.play().catch(() => {});

    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    // He leans out a moment after the page settles, and asks once he is there.
    later(1400, () => setShown(true));
    later(2600, () => setAsking(true));
    later(8600, () => setAsking(false));

    // He asks again once, the first time the guest stops scrolling a while into the page.
    let askedAgain = false;
    let idle = 0;
    function onScroll() {
      setDucked(true);
      setAsking(false);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        setDucked(false);
        if (!askedAgain && window.scrollY > window.innerHeight) {
          askedAgain = true;
          later(900, () => setAsking(true));
          later(6900, () => setAsking(false));
        }
      }, 700);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  const out = !shown || open;

  return (
    <button
      type="button"
      onClick={() => {
        setAsking(false);
        volpe.setOpen(true);
      }}
      aria-label="Ask La Volpe, the head waiter"
      data-state={out ? "out" : ducked ? "ducked" : "in"}
      className="volpe-peek fixed right-0 bottom-24 z-30 h-52 select-none"
    >
      <video
        ref={video}
        muted
        playsInline
        loop
        preload="auto"
        poster="/volpe/peek/sbircia.webp"
        aria-hidden
        className="volpe-peek-fox relative h-full w-auto"
      />
      <span
        aria-hidden={!asking}
        data-asking={asking}
        className="volpe-peek-ask pointer-events-none absolute top-9 right-full mr-1 rounded-2xl rounded-br-sm bg-intonaco px-3.5 py-2 text-lg leading-tight whitespace-nowrap italic shadow-[0_10px_24px_-14px_rgb(42_32_25/0.7)] ring-1 ring-ink/15"
      >
        Do you need help?
      </span>
    </button>
  );
}
