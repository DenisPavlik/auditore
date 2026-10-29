"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Desk } from "@/app/api/volpe/desk/route";
import { SEASON_META, type Season } from "@/lib/seasons";

import { VolpeStage } from "./volpe-stage";
import { volpe } from "./volpe-store";

type Topic = "menu" | "book" | "hours" | "terrace" | "where";
type Line = { from: "volpe" | "guest"; text: ReactNode };

const ASK: Record<Topic, string> = {
  menu: "What’s good tonight?",
  book: "I’d like to book a table.",
  hours: "When are you open?",
  terrace: "Is the terrace open?",
  where: "Where do I find you?",
};

const SERVICE_NAMES = { pranzo: "Pranzo", cena: "Cena" };

function telHref(phone: string) {
  return `tel:${phone.replaceAll(" ", "")}`;
}

/** His answer to a topic, from what he knows by heart. */
function answer(topic: Topic, desk: Desk | null, close: () => void): ReactNode {
  const season = document.documentElement.dataset.season as Season | undefined;
  const action = "mt-3 inline-block font-display text-xs tracking-[0.22em] text-accent-ink uppercase ink-link";
  switch (topic) {
    case "menu":
      return (
        <>
          The kitchen is cooking {season ? `the ${SEASON_META[season].italian.toLowerCase()} menu` : "the season’s menu"}{" "}
          tonight. I would start with the nonna&rsquo;s ribollita and leave room for the bistecca.
          <br />
          <Link href="/menu" onClick={close} className={action}>
            Open La Carta →
          </Link>
        </>
      );
    case "book":
      return (
        <>
          With pleasure. Booking online opens very soon; until then I take tables by phone, and I answer quickly.
          <br />
          <a href={telHref(desk?.house.phone ?? "")} className={action}>
            Call {desk?.house.phone} →
          </a>
        </>
      );
    case "hours":
      return desk ? (
        <>
          {desk.hours.map((row) => (
            <span key={row.days} className="block">
              <span className="italic">{row.days}</span>
              {": "}
              {row.services.length === 0
                ? "chiuso, the kitchen rests"
                : row.services.map((s) => `${SERVICE_NAMES[s.name].toLowerCase()} ${s.opensAt}–${s.lastSeatingAt}`).join(", ")}
            </span>
          ))}
          <span className="mt-2 block text-base text-pietra">The later time is the last seating.</span>
        </>
      ) : null;
    case "terrace": {
      const status = desk?.terrace;
      if (!status) return null;
      if (status.open) return `Aperta! Tables under the pergola until ${status.closesOn}.`;
      if (status.reason === "season")
        return `Not until spring, I’m afraid: it opens again on ${status.opensOn}. La Sala keeps the fire lit until then.`;
      return status.note ?? "Closed today: rain over the Oltrarno, so every table is laid indoors.";
    }
    case "where":
      return (
        <>
          {desk?.house.street}, in the {desk?.house.district}: five minutes from the Ponte Vecchio, the vine over the
          door.
          <br />
          <Link href="/la-casa#map-title" onClick={close} className={action}>
            See the map →
          </Link>
        </>
      );
  }
}

/**
 * La Volpe's desk: a sheet where a guest talks to him, the chat in the
 * column on the left and the fox standing full height on the right. For now he
 * answers what he knows by heart; the real conversation comes with the booking.
 */
export function VolpeDesk() {
  const [open, setOpen] = useState(volpe.get().open);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [asked, setAsked] = useState<Topic[]>([]);
  const [thinking, setThinking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => volpe.subscribe(() => setOpen(volpe.get().open)), []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (open && !desk) {
      fetch("/api/volpe/desk")
        .then((res) => res.json())
        .then(setDesk)
        .catch(() => {});
    }
  }, [open, desk]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [lines, thinking]);

  const close = () => volpe.setOpen(false);

  function ask(topic: Topic) {
    if (thinking) return;
    setAsked((list) => [...list, topic]);
    setLines((list) => [...list, { from: "guest", text: ASK[topic] }]);
    setThinking(true);
    // He leans in to listen, then answers.
    volpe.want("ascolta");
    window.setTimeout(() => {
      setLines((list) => [...list, { from: "volpe", text: answer(topic, desk, close) }]);
      setThinking(false);
      volpe.want(null);
    }, 1100);
  }

  const left = (Object.keys(ASK) as Topic[]).filter((topic) => !asked.includes(topic));

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(event) => event.target === event.currentTarget && close()}
      aria-labelledby="volpe-desk-title"
      className="volpe-desk fixed inset-y-0 right-0 left-auto m-0 h-[100svh] max-h-none w-screen max-w-none overflow-hidden bg-wash p-0 text-ink backdrop:bg-ink/25 backdrop:backdrop-blur-[2px] sm:w-[min(44rem,100vw)] sm:shadow-[-24px_0_60px_-30px_rgb(42_32_25/0.5)]"
    >
      {open && (
        // Turned to face the chat beside him. On a phone he stands half a step past the edge, so his
        // face stays clear of it.
        <VolpeStage className="absolute -right-9 bottom-0 h-[min(56svh,30rem)] -scale-x-100 sm:right-4 sm:h-[min(78svh,40rem)]" />
      )}

      <div className="relative flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 px-5 pt-6 sm:px-10 sm:pt-10">
          <div>
            <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">Il Capocameriere</p>
            <h2 id="volpe-desk-title" className="mt-2 text-4xl italic">
              La Volpe
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-intonaco/80 text-2xl ring-1 ring-ink/10 transition hover:text-accent-ink"
          >
            ×
          </button>
        </header>

        <div
          ref={log}
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-8 pb-6 [mask-image:linear-gradient(to_bottom,transparent,#000_2rem)] sm:px-10"
        >
          <Bubble from="volpe">
            Buonasera! I&rsquo;m La Volpe, head waiter of the house. What can I do for you?
          </Bubble>
          {lines.map((line, i) => (
            <Bubble key={i} from={line.from}>
              {line.text}
            </Bubble>
          ))}
          {thinking && (
            <Bubble from="volpe">
              <span className="inline-flex gap-1.5 py-2" aria-label="La Volpe is answering">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full bg-ink/50 motion-safe:animate-bounce"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
            </Bubble>
          )}
        </div>

        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-10">
          {left.length > 0 && (
            <ul className="flex max-w-[58%] flex-col items-start gap-2 sm:max-w-[60%]">
              {left.map((topic) => (
                <li key={topic}>
                  <button
                    type="button"
                    onClick={() => ask(topic)}
                    disabled={thinking}
                    className="rounded-full bg-intonaco/90 px-4 py-2 text-left text-lg italic ring-1 ring-accent/40 transition hover:ring-accent disabled:opacity-50"
                  >
                    {ASK[topic]}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 max-w-[58%] text-sm text-pietra italic sm:max-w-[60%]">
            Soon you&rsquo;ll be able to write to me in your own words, and I&rsquo;ll book the table myself.
          </p>
        </div>
      </div>
    </dialog>
  );
}

function Bubble({ from, children }: { from: Line["from"]; children: ReactNode }) {
  return (
    <div
      className={`max-w-[58%] rounded-2xl px-4 py-3 text-lg leading-snug shadow-[0_8px_20px_-16px_rgb(42_32_25/0.6)] sm:max-w-[60%] ${
        from === "volpe"
          ? "self-start rounded-tl-sm bg-intonaco ring-1 ring-ink/10"
          : "self-start rounded-tr-sm bg-accent/12 ring-1 ring-accent/25 italic sm:ml-10"
      }`}
    >
      {children}
    </div>
  );
}
