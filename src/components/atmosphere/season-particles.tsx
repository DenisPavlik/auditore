"use client";

import { useEffect, useRef } from "react";

import { useSeason } from "@/components/season/use-season";
import type { Season } from "@/lib/seasons";

// Atlases from scripts/slice-sprites.py: one row of CELL x CELL sprites.
const CELL = 160;
const SPRITES = 9;

type Behaviour = {
  /** Particles per million px² of viewport, and the bounds on that count. */
  density: number;
  min: number;
  max: number;
  /** On-screen size in CSS px at the nearest depth. */
  size: number;
  /** Fall speed in px/s at the nearest depth. */
  fall: number;
  sway: number;
  spin: number;
  /** How fast the sprite tumbles edge-on (rad/s); snow barely turns. */
  tumble: number;
};

const BEHAVIOUR: Record<Season, Behaviour> = {
  autumn: { density: 6, min: 6, max: 16, size: 46, fall: 62, sway: 34, spin: 1.1, tumble: 1.6 },
  winter: { density: 14, min: 12, max: 34, size: 26, fall: 38, sway: 18, spin: 0.35, tumble: 0.25 },
  spring: { density: 7, min: 6, max: 18, size: 30, fall: 44, sway: 40, spin: 1.4, tumble: 2.2 },
  summer: { density: 4, min: 4, max: 10, size: 40, fall: 50, sway: 26, spin: 0.8, tumble: 1.2 },
};

type Layer = "far" | "near";

type Particle = {
  /** The season whose atlas this sprite comes from. */
  season: Season;
  x: number;
  y: number;
  /** 0 = farthest, 1 = nearest: drives size, speed and opacity together. */
  depth: number;
  sprite: number;
  size: number;
  phase: number;
  swayRate: number;
  rotation: number;
  spinRate: number;
  tumblePhase: number;
  tumbleRate: number;
  opacity: number;
  /** Fades in on spawn, out when the season changes. */
  fade: number;
  leaving: boolean;
};

const atlases = new Map<Season, HTMLImageElement>();
function atlasFor(season: Season) {
  let image = atlases.get(season);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = `/particles/${season}.webp`;
    atlases.set(season, image);
  }
  return image;
}

function spawn(season: Season, layer: Layer, width: number, height: number, anywhere: boolean): Particle {
  const b = BEHAVIOUR[season];
  const depth = layer === "near" ? 1 : 0.25 + Math.random() * 0.6;
  const size = layer === "near" ? b.size * (2.6 + Math.random()) : b.size * (0.45 + depth * 0.75);
  return {
    season,
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -size - Math.random() * height * 0.3,
    depth,
    sprite: Math.floor(Math.random() * SPRITES),
    size,
    phase: Math.random() * Math.PI * 2,
    swayRate: 0.6 + Math.random() * 0.8,
    rotation: Math.random() * Math.PI * 2,
    spinRate: (Math.random() - 0.5) * 2 * b.spin,
    tumblePhase: Math.random() * Math.PI * 2,
    tumbleRate: b.tumble * (0.5 + Math.random()),
    opacity: layer === "near" ? 0.9 : 0.55 + depth * 0.4,
    fade: 0,
    leaving: false,
  };
}

function targetCount(season: Season, layer: Layer, width: number, height: number) {
  if (layer === "near") return width < 640 ? 0 : season === "winter" ? 3 : 2;
  const b = BEHAVIOUR[season];
  return Math.round(Math.min(b.max, Math.max(b.min, (b.density * width * height) / 1e6)));
}

/**
 * The season's leaves, snow or petals drifting over the page, painted on a
 * fixed canvas. Two layers make depth: "far" carries small crisp particles,
 * "near" one or two large ones that pass close to the eye, blurred.
 */
export function SeasonParticles({ layer }: { layer: Layer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const season = useSeason();
  const seasonRef = useRef(season);

  useEffect(() => {
    seasonRef.current = season;
  }, [season]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let particles: Particle[] = [];
    let painted: Season | null = null;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let clock = 0;
    let scrollY = window.scrollY;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      clock += dt;

      const season = seasonRef.current;
      if (!season) return;

      // A new season: the old particles fade away while the new ones drift in.
      if (season !== painted) {
        const first = painted === null;
        for (const p of particles) p.leaving = true;
        const count = targetCount(season, layer, width, height);
        for (let i = 0; i < count; i++) particles.push(spawn(season, layer, width, height, first));
        painted = season;
      }

      const b = BEHAVIOUR[season];
      // Slow gusts from two out-of-step waves; scrolling lifts everything a touch.
      const wind = (Math.sin(clock * 0.21) * 0.7 + Math.sin(clock * 0.53 + 1.7) * 0.3) * 24;
      const scrolled = window.scrollY - scrollY;
      scrollY = window.scrollY;

      ctx!.clearRect(0, 0, width, height);
      particles = particles.filter((p) => {
        p.fade = p.leaving ? p.fade - dt * 1.4 : Math.min(1, p.fade + dt * 0.8);
        if (p.leaving && p.fade <= 0) return false;

        const speed = 0.45 + p.depth * 0.55;
        p.phase += dt * p.swayRate;
        p.rotation += dt * p.spinRate;
        p.tumblePhase += dt * p.tumbleRate;
        p.x += (wind + Math.cos(p.phase) * b.sway) * speed * dt;
        p.y += b.fall * speed * dt - scrolled * 0.25 * p.depth;

        const margin = p.size;
        if (p.y > height + margin || p.x < -margin * 2 || p.x > width + margin * 2) {
          if (p.leaving) return false;
          Object.assign(p, spawn(season, layer, width, height, false), { fade: 1 });
        }

        // Tumbling: squash one axis by a cosine, never quite to a sliver.
        const tumble = Math.cos(p.tumblePhase);
        const squash = Math.sign(tumble || 1) * Math.max(0.18, Math.abs(tumble));
        const image = atlasFor(p.season);
        if (!image.complete || image.naturalWidth === 0) return true;
        ctx!.save();
        ctx!.globalAlpha = p.opacity * p.fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.scale(squash, 1);
        ctx!.drawImage(image, p.sprite * CELL, 0, CELL, CELL, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();
        return true;
      });
    }

    function start() {
      if (frame || motion.matches || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    function onMotionPreference() {
      if (motion.matches) {
        stop();
        ctx!.clearRect(0, 0, width, height);
      } else start();
    }

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotionPreference);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotionPreference);
    };
  }, [layer]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-30 size-full ${layer === "near" ? "blur-[2px]" : ""}`}
    />
  );
}
