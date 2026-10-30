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
      // The dot follows the hand exactly, with no lag. Position goes in `translate`, not
      // `transform`, so the CSS `scale` on hover and press shrinks it in place.
      dotEl!.style.translate = `${target.x}px ${target.y}px`;
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
      ringEl!.style.translate = `${pos.x}px ${pos.y}px`;
      frame = requestAnimationFrame(tick);
    }

    // A modal dialog (the desk, the gallery) opens in the top layer, above everything on the page.
    // The cursor goes up there too, and climbs back on top each time another dialog opens.
    const raise = () => {
      for (const el of [ringEl, dotEl]) {
        if (!el.showPopover) return;
        if (el.matches(":popover-open")) el.hidePopover();
        el.showPopover();
      }
    };
    const dialogs = new MutationObserver((changes) => {
      if (changes.some((change) => change.target instanceof HTMLDialogElement && change.target.open)) raise();
    });

    const root = document.documentElement;
    root.dataset.cursor = "pigment";
    show(false);
    raise();
    dialogs.observe(document.body, { subtree: true, attributeFilter: ["open"] });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    root.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      dialogs.disconnect();
      delete root.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden popover="manual" className="pigment-cursor pigment-ring" />
      <div ref={dot} aria-hidden popover="manual" className="pigment-cursor pigment-dot" />
    </>
  );
}
