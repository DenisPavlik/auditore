"use client";

import { useEffect } from "react";

/**
 * A click leaves a small bloom of the season's pigment on the page that
 * spreads and dries away. Mouse only, never under reduced motion.
 */
export function InkBlots() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.button !== 0 || motion.matches) return;
      const blot = document.createElement("span");
      blot.className = "ink-blot";
      blot.style.left = `${event.clientX}px`;
      blot.style.top = `${event.clientY}px`;
      blot.style.setProperty("--blot-turn", `${Math.round(Math.random() * 360)}deg`);
      blot.addEventListener("animationend", () => blot.remove(), { once: true });
      document.body.append(blot);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
