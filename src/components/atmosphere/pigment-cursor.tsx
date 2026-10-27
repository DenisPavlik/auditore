"use client";

import { useEffect, useRef } from "react";

const CLICKABLE = 'a, button, summary, label, select, [role="button"], [role="radio"], [role="tab"]';
const TEXT = 'input, textarea, [contenteditable="true"]';

/**
 * The pointer as a dot of the season's pigment with a ring that trails after
 * it; over anything clickable the dot sinks in and the ring fills like a wash.
 * Mouse only: it hides the system cursor only once it is drawing its own.
 */
export function PigmentCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dotEl = dot.current;
    const ringEl = ring.current;
    if (!dotEl || !ringEl || !window.matchMedia("(pointer: fine)").matches) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;

    const show = (visible: boolean) => {
      for (const el of [dotEl, ringEl]) el.style.opacity = visible ? "1" : "0";
    };

    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      target.x = event.clientX;
      target.y = event.clientY;
      // The dot follows the hand exactly, with no lag.
      dotEl!.style.transform = `translate(${target.x}px, ${target.y}px)`;
      const el = event.target instanceof Element ? event.target : null;
      show(!el?.closest(TEXT));
      const hover = Boolean(el?.closest(CLICKABLE));
      for (const node of [dotEl!, ringEl!]) node.toggleAttribute("data-hover", hover);
    }

    const onDown = () => ringEl.toggleAttribute("data-press", true);
    const onUp = () => ringEl.toggleAttribute("data-press", false);
    const onLeave = () => show(false);

    function tick() {
      const ease = motion.matches ? 1 : 0.2;
      pos.x += (target.x - pos.x) * ease;
      pos.y += (target.y - pos.y) * ease;
      ringEl!.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      frame = requestAnimationFrame(tick);
    }

    const root = document.documentElement;
    root.dataset.cursor = "pigment";
    show(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    root.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      delete root.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden className="pigment-cursor pigment-ring" />
      <div ref={dot} aria-hidden className="pigment-cursor pigment-dot" />
    </>
  );
}
