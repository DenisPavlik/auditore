"use client";

import { createContext, useContext, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import type { PlanTable, ZoneSlug } from "@/lib/booking";

export type TableState = "free" | "taken" | "unfit" | "closed";

type Box = { x: number; y: number; w: number; h: number };

/** The three rooms, each with the pigment it is washed in, in plan units. */
export const ZONES: { slug: ZoneSlug; name: string; hint: string; box: Box; wash: string }[] = [
  { slug: "sala", name: "La Sala", hint: "Under the vaults", box: { x: 100, y: 160, w: 780, h: 476 }, wash: "var(--oro)" },
  { slug: "galleria", name: "La Galleria", hint: "By the arched windows", box: { x: 100, y: 636, w: 780, h: 144 }, wash: "var(--pietra)" },
  { slug: "terrazza", name: "La Terrazza", hint: "Under the vine", box: { x: 900, y: 140, w: 420, h: 640 }, wash: "#7d8a5a" },
];

export const TAGS: Record<string, string> = {
  window: "by the window",
  quiet: "quiet",
  booth: "booth",
  garden: "among the plants",
  "fountain-view": "by the fountain",
  pergola: "under the pergola",
  "family-table": "the family table",
};

const FONT = { display: "var(--font-marcellus)", serif: "var(--font-garamond)" };

/** Whether the drawing is turned a quarter, so a wide room fits a phone held upright. */
const Turned = createContext(false);

/** Text that stays upright when the plan is turned, unless it runs along a wall. */
function Words({ x, y, along = false, children, ...rest }: { x: number; y: number; along?: boolean; children: ReactNode } & React.SVGProps<SVGTextElement>) {
  const turned = useContext(Turned) && !along;
  return (
    <text x={x} y={y} transform={turned ? `rotate(-90 ${x} ${y})` : undefined} {...rest}>
      {children}
    </text>
  );
}

/** Chair positions around a table, as [x, y, angle]. */
function chairs(t: PlanTable): [number, number, number][] {
  const out: [number, number, number][] = [];
  if (t.shape === "round") {
    const r = t.width / 2 + 11;
    for (let i = 0; i < t.maxGuests; i++) {
      const a = (i / t.maxGuests) * Math.PI * 2 - Math.PI / 2;
      out.push([t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, (a * 180) / Math.PI + 90]);
    }
  } else if (t.shape === "square") {
    const d = t.width / 2 + 11;
    const sides: [number, number, number][] = [[-d, 0, 90], [d, 0, 90], [0, -d, 0], [0, d, 0]];
    for (const [dx, dy, a] of sides.slice(0, t.maxGuests)) out.push([t.x + dx, t.y + dy, a]);
  } else if (t.shape === "rect") {
    const per = Math.ceil(t.maxGuests / 2);
    for (let i = 0; i < per; i++) {
      const x = t.x - t.width / 2 + ((i + 0.5) * t.width) / per;
      out.push([x, t.y - t.height / 2 - 11, 0], [x, t.y + t.height / 2 + 11, 0]);
    }
  }
  return out;
}

/** The table top. A booth's table sits inside its bench, nudged towards the open side. */
function Top({ t, grow = 0, ...rest }: { t: PlanTable; grow?: number } & React.SVGProps<SVGRectElement & SVGCircleElement>) {
  if (t.shape === "round") return <circle cx={t.x} cy={t.y} r={t.width / 2 + grow} {...rest} />;
  const booth = t.shape === "booth";
  const w = (booth ? t.width - 44 : t.width) + grow * 2;
  const h = (booth ? t.height - 40 : t.height) + grow * 2;
  return <rect x={t.x - w / 2 + (booth ? 10 : 0)} y={t.y - h / 2} width={w} height={h} rx={t.shape === "rect" ? 6 : 4} {...rest} />;
}

/** The booth's U-shaped bench, open towards the hall. */
function bench(t: PlanTable) {
  const l = t.x - t.width / 2;
  const r = t.x + t.width / 2;
  const top = t.y - t.height / 2;
  const bottom = t.y + t.height / 2;
  return `M${l + 20},${top} H${r} V${bottom} H${l + 20} V${bottom - 16} H${r - 16} V${top + 16} H${l + 20} Z`;
}

export function describe(t: PlanTable, state: TableState) {
  const seats = t.minGuests === t.maxGuests ? `${t.maxGuests}` : `${t.minGuests} to ${t.maxGuests}`;
  const tags = t.tags.map((tag) => TAGS[tag] ?? tag);
  const status = { free: "free", taken: "taken", unfit: "not for this party", closed: "closed" }[state];
  return [`Table ${t.label}`, `seats ${seats}`, ...tags, status].join(", ");
}

type DrawingProps = {
  tables: PlanTable[];
  states: Record<string, TableState>;
  chosen: string | null;
  onChoose: (label: string) => void;
  terraceLaid: boolean;
  /** Bigger labels and tap targets, for a room seen on its own on a phone. */
  close?: boolean;
};

/** The house drawn in ink over washes of each room's pigment, with every table on it. */
function Drawing({ tables, states, chosen, onChoose, terraceLaid, close = false }: DrawingProps) {
  const label = close ? 20 : 14;
  // The plan is drawn twice (whole house, and a room up close), so its patterns need their own names.
  const id = useId().replaceAll(":", "");
  const ref = (name: string) => `url(#${id}-${name})`;
  const press = (event: KeyboardEvent, t: PlanTable) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (states[t.label] === "free") onChoose(t.label);
  };

  return (
    <>
      <defs>
        <filter id={`${id}-wash`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" result="moved" />
          <feGaussianBlur in="moved" stdDeviation="2" />
        </filter>
        <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--ink)" strokeWidth="1.1" opacity="0.55" />
        </pattern>
        <pattern id={`${id}-taken`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="1.4" opacity="0.45" />
        </pattern>
        <pattern id={`${id}-cotto`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke="var(--ink)" strokeWidth="0.6" opacity="0.14" />
        </pattern>
      </defs>

      {/* Each room in its own pigment, so the eye finds the hall, the windows and the terrace at once. */}
      <g filter={ref("wash")}>
        {ZONES.map((zone) => (
          <rect
            key={zone.slug}
            x={zone.box.x + 14}
            y={zone.box.y + (zone.slug === "sala" ? 66 : 8)}
            width={zone.box.w - 28}
            height={zone.box.h - (zone.slug === "sala" ? 74 : 22)}
            rx="16"
            fill={zone.wash}
            opacity={zone.slug === "terrazza" && !terraceLaid ? 0.12 : 0.24}
          />
        ))}
      </g>

      {/* Walls of the house, hatched, with the cross vaults of the hall drawn faintly. */}
      <path d="M100 160H880V780H100Z M114 174V766H866V174Z" fill={ref("hatch")} fillRule="evenodd" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M114 174H866V226H114Z" fill={ref("hatch")} opacity="0.5" />
      <Words x={490} y={206} along textAnchor="middle" fontFamily={FONT.display} fontSize={close ? 18 : 15} letterSpacing="6" fill="var(--ink)">
        CUCINA · LA BRACE
      </Words>
      <path d="M114 226L490 630M490 226L114 630M490 226L866 630M866 226L490 630" fill="none" stroke="var(--ink)" strokeWidth="0.8" strokeDasharray="2 6" opacity="0.3" />
      <line x1="114" y1="636" x2="866" y2="636" stroke="var(--ink)" strokeWidth="0.8" strokeDasharray="10 6" opacity="0.5" />
      {[120, 245, 375, 445, 580, 715].map((x) => (
        <g key={x}>
          <rect x={x + 4} y="766" width="66" height="14" fill="var(--intonaco)" />
          <path d={`M${x + 4} 773 H${x + 70} M${x + 4} 766 Q${x + 37} 744 ${x + 70} 766`} fill="none" stroke="var(--ink)" strokeWidth="1" />
        </g>
      ))}
      <rect x="96" y="330" width="22" height="80" fill="var(--intonaco)" />
      <path d="M114 330 A80 80 0 0 1 194 410" fill="none" stroke="var(--ink)" strokeWidth="0.9" strokeDasharray="3 3" />
      <line x1="114" y1="330" x2="114" y2="410" stroke="var(--ink)" strokeWidth="1.4" />
      <text x="92" y="372" textAnchor="middle" fontFamily={FONT.serif} fontStyle="italic" fontSize="14" fill="var(--ink)" transform="rotate(-90 92 372)">
        ingresso
      </text>

      {/* The roof terrace: cotto tiles, the parapet's balusters, the pergola's vine and the fountain. */}
      <rect x="900" y="140" width="420" height="640" fill={ref("cotto")} stroke="var(--ink)" strokeWidth="1.4" />
      {Array.from({ length: 27 }, (_, i) => (
        <circle key={i} cx="1320" cy={150 + i * 23.5} r="3.2" fill="var(--intonaco)" stroke="var(--ink)" strokeWidth="0.9" />
      ))}
      <rect x="900" y="488" width="250" height="104" fill="none" stroke="var(--ink)" strokeWidth="0.9" strokeDasharray="1 5" strokeLinecap="round" />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${908 + i * 17.5} 488 q5 -9 10 0 q-5 6 -10 0`} fill="none" stroke="#55633a" strokeWidth="0.9" opacity="0.7" />
      ))}
      <g fill="none" stroke="var(--ink)" strokeWidth="0.9">
        <circle cx="1025" cy="442" r="26" />
        <circle cx="1025" cy="442" r="16" opacity="0.5" />
        <circle cx="1025" cy="442" r="4" />
      </g>
      <Words x={1270} y={176} textAnchor="middle" fontFamily={FONT.serif} fontStyle="italic" fontSize={close ? 19 : 15} fill="var(--ink)">
        Duomo ↗
      </Words>

      {/* Up close the rail at the side names the room. */}
      {!close && (
        <>
          <Words x={182} y={600} textAnchor="middle" fontFamily={FONT.display} fontSize="13" letterSpacing="7" fill="var(--pietra)">
            LA SALA
          </Words>
          <Words x={792} y={712} textAnchor="middle" fontFamily={FONT.display} fontSize="13" letterSpacing="7" fill="var(--pietra)">
            LA GALLERIA
          </Words>
          <Words x={1110} y={130} textAnchor="middle" fontFamily={FONT.display} fontSize="13" letterSpacing="7" fill="var(--pietra)">
            LA TERRAZZA
          </Words>
        </>
      )}
      {!terraceLaid && (
        <Words x={1110} y={760} textAnchor="middle" fontFamily={FONT.serif} fontStyle="italic" fontSize={close ? 22 : 17} fill="var(--accent-ink)">
          covered until spring
        </Words>
      )}

      {tables.map((t) => {
        const state = states[t.label] ?? "unfit";
        const mine = t.label === chosen;
        const ink = mine ? "var(--accent-ink)" : "var(--ink)";
        const open = state === "free";
        return (
          <g
            key={t.label}
            data-table={t.label}
            role="button"
            tabIndex={open ? 0 : -1}
            aria-pressed={mine}
            aria-disabled={!open}
            aria-label={describe(t, state)}
            // Up close the room reads taps itself, as they share the finger with pinch and drag.
            onClick={close ? undefined : () => open && onChoose(t.label)}
            onKeyDown={(event) => press(event, t)}
            className={`plan-table outline-none ${open ? "cursor-pointer" : ""}`}
            data-state={state}
            opacity={state === "unfit" || state === "closed" ? 0.32 : 1}
          >
            {/* A wider ring to tap than the table itself, for fingers on a small plan. */}
            <circle cx={t.x} cy={t.y} r={Math.max(t.width, t.height) / 2 + (close ? 22 : 12)} fill="transparent" />
            {chairs(t).map(([x, y, a], i) => (
              <rect key={i} x={x - 8} y={y - 4.5} width="16" height="9" rx="3" transform={`rotate(${a} ${x} ${y})`} fill="var(--intonaco)" stroke={ink} strokeWidth="1" />
            ))}
            {t.shape === "booth" && <path d={bench(t)} fill={ref("hatch")} stroke="var(--ink)" strokeWidth="1.1" />}
            <Top
              t={t}
              className="plan-top"
              fill={mine ? "var(--accent)" : state === "taken" ? ref("taken") : "var(--intonaco)"}
              stroke={ink}
              strokeWidth={mine ? 2 : 1.3}
              strokeDasharray={state === "closed" ? "4 4" : undefined}
            />
            <Top t={t} grow={9} className="plan-ring" fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="2 4" opacity={mine ? 1 : 0} />
            <Words
              x={t.x + (t.shape === "booth" ? 10 : 0)}
              y={t.y + label * 0.36}
              textAnchor="middle"
              fontFamily={FONT.display}
              fontSize={label}
              letterSpacing="1"
              fill={mine ? "var(--intonaco)" : "var(--ink)"}
              pointerEvents="none"
            >
              {t.label}
            </Words>
          </g>
        );
      })}
    </>
  );
}

type PlanProps = Omit<DrawingProps, "close">;

/**
 * The floor plan to choose a table on. On a wide screen the whole house at once; on a phone one
 * room at a time, picked from the rail at the side like the floors of a waiter's tablet, and
 * pinched or dragged to look closer.
 */
export function FloorPlan({ zone: shown, onZone, ...props }: PlanProps & { zone?: ZoneSlug; onZone?: (zone: ZoneSlug) => void }) {
  const [own, setOwn] = useState<ZoneSlug>("sala");
  const zone = shown ?? own;
  const setZone = onZone ?? setOwn;
  const free = (slug: ZoneSlug) => props.tables.filter((t) => t.zone === slug && props.states[t.label] === "free").length;

  return (
    <div>
      <div className="hidden sm:block">
        <svg viewBox="80 110 1260 700" className="w-full" role="group" aria-label="Floor plan of the house">
          <Drawing {...props} />
        </svg>
      </div>

      <div className="flex gap-3 sm:hidden">
        <ul role="tablist" aria-label="Rooms" aria-orientation="vertical" className="flex w-24 shrink-0 flex-col gap-2">
          {ZONES.map((z) => {
            const active = z.slug === zone;
            const count = free(z.slug);
            return (
              <li key={z.slug}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setZone(z.slug)}
                  className={`flex w-full flex-col items-start gap-1 rounded-lg px-2.5 py-2.5 text-left transition ${
                    active ? "bg-intonaco ring-1 ring-ink/20 shadow-[0_8px_20px_-14px_rgb(42_32_25/0.7)]" : "ring-1 ring-transparent"
                  }`}
                >
                  <span className="h-1.5 w-8 rounded-full" style={{ background: z.wash, opacity: 0.75 }} />
                  <span className="font-display text-[0.7rem] leading-tight tracking-[0.14em] uppercase">{z.name.replace("La ", "")}</span>
                  <span className="text-sm leading-none text-pietra italic">
                    {z.slug === "terrazza" && !props.terraceLaid ? "closed" : count ? `${count} free` : "full"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Room key={zone} slug={zone} {...props} />
      </div>
    </div>
  );
}

const ZOOM_BUTTON =
  "grid size-9 place-items-center rounded-full bg-intonaco/90 font-display text-lg ring-1 ring-ink/15 shadow-[0_6px_14px_-10px_rgb(42_32_25/0.8)]";

/** One room seen close, turned upright when it is wider than tall, to pinch and drag about. */
function Room({ slug, ...props }: PlanProps & { slug: ZoneSlug }) {
  const zone = ZONES.find((z) => z.slug === slug)!;
  const turned = zone.box.w > zone.box.h;
  const pad = 18;
  const room = { x: zone.box.x - pad, y: zone.box.y - pad, w: zone.box.w + pad * 2, h: zone.box.h + pad * 2 };
  // Turning a quarter clockwise sends (x, y) to (-y, x).
  const fit: Box = turned ? { x: -(room.y + room.h), y: room.x, w: room.h, h: room.w } : room;

  const [view, setView] = useState(fit);
  const clip = useId().replaceAll(":", "");
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const travel = useRef(0);
  const zoomed = view.w < fit.w - 0.5;

  /** Keeps the view inside the room and no closer than a quarter of it. */
  function settle(next: Box): Box {
    const w = Math.min(fit.w, Math.max(fit.w / 4, next.w));
    const h = (w / fit.w) * fit.h;
    const x = Math.min(fit.x + fit.w - w, Math.max(fit.x, next.x + (next.w - w) / 2));
    const y = Math.min(fit.y + fit.h - h, Math.max(fit.y, next.y + (next.h - h) / 2));
    return { x, y, w, h };
  }

  /** Zooms by a factor around a point given in screen pixels. */
  function zoomAt(factor: number, cx?: number, cy?: number) {
    const rect = svg.current!.getBoundingClientRect();
    const px = cx === undefined ? 0.5 : (cx - rect.left) / rect.width;
    const py = cy === undefined ? 0.5 : (cy - rect.top) / rect.height;
    setView((v) => {
      const w = v.w / factor;
      const h = v.h / factor;
      return settle({ x: v.x + (v.w - w) * px, y: v.y + (v.h - h) * py, w, h });
    });
  }

  function down(event: PointerEvent<SVGSVGElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) travel.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    const now = { x: event.clientX, y: event.clientY };
    const rect = event.currentTarget.getBoundingClientRect();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const other = a === before ? b : a;
      const was = Math.hypot(before.x - other.x, before.y - other.y);
      const is = Math.hypot(now.x - other.x, now.y - other.y);
      if (was > 0) zoomAt(is / was, (now.x + other.x) / 2, (now.y + other.y) / 2);
      travel.current += 99;
    } else {
      const dx = now.x - before.x;
      const dy = now.y - before.y;
      travel.current += Math.abs(dx) + Math.abs(dy);
      setView((v) => settle({ ...v, x: v.x - (dx * v.w) / rect.width, y: v.y - (dy * v.h) / rect.height }));
    }
    pointers.current.set(event.pointerId, now);
  }

  function up(event: PointerEvent<SVGSVGElement>) {
    const was = pointers.current.size;
    pointers.current.delete(event.pointerId);
    // A tap, not a drag: the captured pointer lands on the svg, so find the table under the finger.
    if (was === 1 && travel.current < 8) {
      const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<SVGGElement>("[data-table]");
      const label = hit?.dataset.table;
      if (label && props.states[label] === "free") props.onChoose(label);
    }
  }

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-intonaco/60 ring-1 ring-ink/10" style={{ aspectRatio: `${fit.w} / ${fit.h}`, maxHeight: "62svh" }}>
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="size-full select-none"
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
        role="group"
        aria-label={`${zone.name}, ${zone.hint.toLowerCase()}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
      >
        {/* Only this room: a phone screen's shape leaves room at the sides, and the next room would show in it. */}
        <clipPath id={`${clip}-room`}>
          <rect x={room.x} y={room.y} width={room.w} height={room.h} />
        </clipPath>
        <Turned.Provider value={turned}>
          <g transform={turned ? "rotate(90)" : undefined} clipPath={`url(#${clip}-room)`}>
            <Drawing {...props} close />
          </g>
        </Turned.Provider>
      </svg>
      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5">
        <button type="button" aria-label="Closer" onClick={() => zoomAt(1.6)} className={ZOOM_BUTTON}>
          +
        </button>
        <button type="button" aria-label="Further" onClick={() => zoomAt(1 / 1.6)} className={ZOOM_BUTTON}>
          −
        </button>
      </div>
    </div>
  );
}
