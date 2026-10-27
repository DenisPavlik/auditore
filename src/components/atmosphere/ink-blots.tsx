"use client";

import { useEffect } from "react";

const SVG = "http://www.w3.org/2000/svg";
let serial = 0;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** A filter that roughens a shape's edge the way a wet wash spreads into paper fibres. */
function roughEdge(id: string, frequency: number, scale: number) {
  return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
    <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" seed="${Math.round(random(1, 999))}" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
}

/**
 * Watercolour bloom: a pale wash that spreads out and dries with a darker rim,
 * where pigment gathers at the edge of a puddle on paper.
 */
function acquerello(id: string) {
  return `<defs>
    ${roughEdge(`${id}-edge`, 0.045, 16)}
    <radialGradient id="${id}-wash">
      <stop offset="0" style="stop-color:var(--accent)" stop-opacity=".2"/>
      <stop offset=".62" style="stop-color:var(--accent)" stop-opacity=".26"/>
      <stop offset=".86" style="stop-color:var(--accent)" stop-opacity=".55"/>
      <stop offset=".95" style="stop-color:var(--accent-ink)" stop-opacity=".7"/>
      <stop offset="1" style="stop-color:var(--accent)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g filter="url(#${id}-edge)">
    <circle class="blot-spread" r="34" fill="url(#${id}-wash)"/>
    <circle class="blot-spread blot-late" r="14" cx="${random(-14, 14)}" cy="${random(-14, 14)}" fill="url(#${id}-wash)"/>
  </g>`;
}

/** Droplets thrown out one way, as when a pen or brush is flicked. */
function spray(count: number, throwAngle: number) {
  return Array.from({ length: count }, (_, i) => {
    // Most of the spray goes one way, as when a pen is flicked.
    const angle = i < 3 ? random(0, Math.PI * 2) : throwAngle + random(-0.9, 0.9);
    const distance = random(16, 58);
    const r = Math.max(1, 5 - distance / 14 + random(-0.7, 0.7));
    const delay = Math.round(distance * 2.5);
    return `<circle class="blot-fly" r="${r.toFixed(1)}" style="--dx:${(Math.cos(angle) * distance).toFixed(1)}px;--dy:${(Math.sin(angle) * distance).toFixed(1)}px;animation-delay:${delay}ms"/>`;
  }).join("");
}

/** The watercolour bloom with a few droplets of the same pigment flicked off it. */
function blot(id: string) {
  return `${acquerello(id)}
  <defs>${roughEdge(`${id}-drops`, 0.18, 4)}</defs>
  <g filter="url(#${id}-drops)" style="fill:var(--accent-ink)" fill-opacity=".8">${spray(Math.round(random(5, 8)), random(0, Math.PI * 2))}</g>`;
}

/**
 * A click leaves a small watercolour bloom of the season's pigment on the
 * page, with a flick of droplets, that spreads and dries away. Mouse only,
 * never under reduced motion.
 */
export function InkBlots() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.button !== 0 || motion.matches) return;
      const el = document.createElementNS(SVG, "svg");
      el.setAttribute("viewBox", "-60 -60 120 120");
      el.setAttribute("class", "ink-drop");
      el.innerHTML = blot(`blot-${++serial}`);
      el.style.left = `${event.clientX}px`;
      el.style.top = `${event.clientY}px`;
      el.style.setProperty("--blot-turn", `${Math.round(Math.random() * 360)}deg`);
      el.addEventListener("animationend", (e) => e.target === el && el.remove());
      document.body.append(el);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
