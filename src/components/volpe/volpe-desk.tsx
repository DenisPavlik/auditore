"use client";

import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import type { BookReply } from "@/app/api/booking/route";
import type { ChatLine } from "@/app/api/volpe/chat/route";
import type { Offer } from "@/lib/booking";

import { VolpeStage } from "./volpe-stage";
import { volpe } from "./volpe-store";

type Line =
  | { id: number; from: "guest" | "volpe"; text: string }
  | { id: number; from: "card"; offer: Offer };

/** Ways into the conversation for a guest who doesn't know what to ask. */
const OPENERS = [
  "What’s good tonight?",
  "I’d like to book a table.",
  "When are you open?",
  "Is the terrace open?",
  "Where do I find you?",
];

const MESSAGE_LIMIT = 500;

// The only places his links may lead.
const LINK = /\[([^\]]+)\]\((\/menu|\/la-casa#map-title|\/la-casa|\/galleria|\/prenota(?:\?[\w=&:-]*)?|tel:\+?\d+)\)/g;

/** His words, with the links he is allowed to give turned into real ones. */
function Words({ text, close }: { text: string; close: () => void }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    parts.push(text.slice(last, match.index));
    const [, label, href] = match;
    const className = "text-accent-ink ink-link";
    parts.push(
      href.startsWith("tel:") ? (
        <a key={match.index} href={href} className={className}>
          {label}
        </a>
      ) : (
        <Link key={match.index} href={href} onClick={close} className={className}>
          {label}
        </Link>
      ),
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function spellDate(date: string) {
  return longDate.format(new Date(`${date}T12:00:00Z`));
}

/**
 * La Volpe's desk: a sheet where a guest talks to him, the chat in the column
 * on the left and the fox standing full height on the right. He answers from
 * the house's own data and holds out tables; a booking is made only when the
 * guest confirms the card he hands them.
 */
export function VolpeDesk() {
  const [open, setOpen] = useState(volpe.get().open);
  const [lines, setLines] = useState<Line[]>([]);
  const [transcript, setTranscript] = useState<BetaMessageParam[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // What happened at the desk that he should know before the guest's next words.
  const note = useRef<string | null>(null);
  const nextId = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => volpe.subscribe(() => setOpen(volpe.get().open)), []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [lines, waiting]);

  // The keyboard only slides over the desk, as it would over a sheet of paper: the desk keeps its
  // size and place, the writing line rises with the keys, and he draws back beside it. All of it
  // moves on the keyboard's own beat, so nothing jumps while the keys come and go.
  useEffect(() => {
    const el = dialog.current;
    const view = window.visualViewport;
    const column = el?.querySelector<HTMLElement>(".volpe-desk-column");
    const stand = el?.querySelector<HTMLElement>(".volpe-desk-stand");
    const fox = el?.querySelector<HTMLElement>(".volpe-stage-fox");
    const form = el?.querySelector<HTMLElement>("form");
    if (!open || !el || !view || !column || !stand || !fox || !form) return;

    const BEAT = { duration: 260, easing: "cubic-bezier(0.25, 0.9, 0.3, 1)", fill: "forwards" } as const;
    let keys = -1;
    let follow = 0;

    /** Moves a property from wherever it is now, even mid-move, to where it should be. */
    function glide(target: HTMLElement, property: "paddingBottom" | "transform", to: string) {
      const from = getComputedStyle(target)[property];
      for (const animation of target.getAnimations()) animation.cancel();
      target.style[property] = to;
      if (from !== to) target.animate([{ [property]: from }, { [property]: to }], { ...BEAT, fill: "none" });
    }

    /** Keeps the conversation's last words, or the card field being filled, in sight while the line rises. */
    function keepInSight(until: number) {
      cancelAnimationFrame(follow);
      const list = log.current;
      const step = () => {
        if (!list) return;
        const field = document.activeElement;
        if (field instanceof HTMLElement && list.contains(field)) {
          const below = field.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom + 16;
          if (below > 0) list.scrollTop += below;
        } else {
          list.scrollTop = list.scrollHeight;
        }
        if (performance.now() < until) follow = requestAnimationFrame(step);
      };
      step();
    }

    function settle(next: number) {
      if (!el || !column || !stand || !fox || !form || next === keys) return;
      keys = next;
      el.toggleAttribute("data-keys", keys > 0);
      // The line sits just above the keys; the form's own bottom space is for the home bar, which they cover.
      const lift = keys ? Math.max(0, keys - parseFloat(getComputedStyle(form).paddingBottom) + 12) : 0;
      glide(column, "paddingBottom", `${lift}px`);
      // He fits between the header and the keys, standing on the keyboard's edge.
      const header = el.querySelector("header")!.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
      const size = keys ? Math.min(1, (el.offsetHeight - keys - header - 12) / fox.offsetHeight) : 1;
      glide(stand, "transform", `translateY(${-keys}px) scale(${size.toFixed(3)})`);
      keepInSight(performance.now() + BEAT.duration + 40);
    }

    const fit = () => {
      // Should Safari still slide the page, the desk stays on what is visible.
      el.style.setProperty("--desk-top", `${view.offsetTop}px`);
      const covered = el.offsetHeight - view.height;
      // Safari's own bars move the edge a little too; only a keyboard covers this much.
      if (el.hasAttribute("data-typing")) settle(covered > 120 ? Math.round(covered) : 0);
    };

    // Safari slides the whole page up to show a field it focuses, then the desk would have to chase it.
    // Focusing the field ourselves, without that slide, leaves the page still.
    const tap = (event: TouchEvent) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
      if (field === document.activeElement || field.disabled) return;
      event.preventDefault();
      field.focus({ preventScroll: true });
    };
    // Only the conversation scrolls; dragging anywhere else would move the page beneath.
    const hold = (event: TouchEvent) => {
      if (!(event.target instanceof Node && log.current?.contains(event.target))) event.preventDefault();
    };
    // The page beneath is hidden from the moment typing starts, and the desk lets go as soon as it
    // ends, together with the keys going down rather than after them.
    const typing = () =>
      requestAnimationFrame(() => {
        const field = document.activeElement;
        const writing = field instanceof HTMLElement && el.contains(field) && field.matches("input, textarea");
        el.toggleAttribute("data-typing", writing);
        if (!writing) settle(0);
        else fit();
      });

    fit();
    view.addEventListener("resize", fit);
    view.addEventListener("scroll", fit);
    el.addEventListener("touchend", tap, { passive: false });
    el.addEventListener("touchmove", hold, { passive: false });
    el.addEventListener("focusin", typing);
    el.addEventListener("focusout", typing);
    return () => {
      cancelAnimationFrame(follow);
      view.removeEventListener("resize", fit);
      view.removeEventListener("scroll", fit);
      el.removeEventListener("touchend", tap);
      el.removeEventListener("touchmove", hold);
      el.removeEventListener("focusin", typing);
      el.removeEventListener("focusout", typing);
      el.removeAttribute("data-typing");
      el.removeAttribute("data-keys");
      column.style.paddingBottom = "";
      stand.style.transform = "";
    };
  }, [open]);

  const close = () => volpe.setOpen(false);
  const id = () => nextId.current++;

  function say(from: "guest" | "volpe", text: string) {
    setLines((list) => [...list, { id: id(), from, text }]);
  }

  /** Adds to his bubble as he writes, or opens a new one. */
  function write(text: string, fresh: boolean) {
    setLines((list) => {
      const last = list.at(-1);
      if (!fresh && last?.from === "volpe") return [...list.slice(0, -1), { ...last, text: last.text + text }];
      return [...list, { id: id(), from: "volpe", text }];
    });
  }

  async function ask(text: string) {
    const message = text.trim().slice(0, MESSAGE_LIMIT);
    if (!message || busy) return;
    setDraft("");
    say("guest", message);
    setBusy(true);
    setWaiting(true);
    // He leans in to listen while he finds the answer.
    volpe.want("ascolta");

    const sent = note.current ? `(${note.current})\n\n${message}` : message;
    note.current = null;
    let fresh = true;
    const offers: Offer[] = [];
    try {
      const response = await fetch("/api/volpe/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript, message: sent }),
      });
      if (!response.body) throw new Error("no answer");
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const rows = buffer.split("\n");
        buffer = rows.pop() ?? "";
        for (const row of rows) {
          if (!row) continue;
          const line = JSON.parse(row) as ChatLine;
          if (line.type === "text" || line.type === "error") {
            if (fresh) {
              setWaiting(false);
              volpe.want(null);
            }
            write(line.text, fresh);
            fresh = false;
          } else if (line.type === "break") {
            fresh = true;
          } else if (line.type === "offer") {
            // The card goes on the desk once he has finished saying what it is.
            offers.push(line.offer);
          } else if (line.type === "done") {
            setTranscript(line.transcript);
          }
        }
      }
    } catch {
      write("Scusi, I lost the thread for a moment. Could you say that again?", true);
    } finally {
      setLines((list) => [...list, ...offers.map((offer) => ({ id: id(), from: "card" as const, offer }))]);
      setBusy(false);
      setWaiting(false);
      volpe.want(null);
    }
  }

  function booked(offer: Offer, name: string) {
    const first = name.split(" ")[0];
    say(
      "volpe",
      `Perfetto, ${first}! Table ${offer.table.label} is yours on ${spellDate(offer.date)} at ${offer.time}. We’ll keep the bread warm.`,
    );
    note.current = `At the desk: the guest confirmed the booking, table ${offer.table.label} on ${offer.date} at ${offer.time} for ${offer.partySize}.`;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  const started = lines.some((line) => line.from === "guest");

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(event) => event.target === event.currentTarget && close()}
      aria-labelledby="volpe-desk-title"
      className="volpe-desk group fixed top-[var(--desk-top,0px)] right-0 bottom-auto left-auto m-0 h-[100svh] max-h-none w-screen max-w-none overflow-hidden bg-wash p-0 text-ink backdrop:bg-wash sm:w-[min(44rem,100vw)] sm:shadow-[-24px_0_60px_-30px_rgb(42_32_25/0.5)] sm:backdrop:bg-ink/25 sm:backdrop:backdrop-blur-[2px]"
    >
      {open && (
        // Turned to face the chat beside him. On a phone he stands half a step past the edge, so his
        // face stays clear of it. While the keyboard is up he draws back, whole, beside the writing line.
        <div className="volpe-desk-stand pointer-events-none absolute inset-0 origin-bottom-right will-change-transform">
          <VolpeStage className="volpe-stage-fox absolute -right-9 bottom-0 h-[min(56svh,30rem)] -scale-x-100 sm:right-4 sm:h-[min(78svh,40rem)]" />
        </div>
      )}

      <div className="volpe-desk-column relative flex h-full flex-col">
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
            className="grid size-11 shrink-0 place-items-center rounded-full bg-intonaco/80 ring-1 ring-ink/10 transition hover:text-accent-ink"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div
          ref={log}
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-8 pb-6 [mask-image:linear-gradient(to_bottom,transparent,#000_2rem)] sm:px-10"
        >
          <Bubble from="volpe">
            Buonasera! I&rsquo;m La Volpe, head waiter of the house. Ask me about tonight&rsquo;s menu, or tell me
            when you&rsquo;d like to come and I&rsquo;ll find you a table.
          </Bubble>
          {lines.map((line) =>
            line.from === "card" ? (
              <BookingCard key={line.id} offer={line.offer} onBooked={(name) => booked(line.offer, name)} />
            ) : (
              <Bubble key={line.id} from={line.from}>
                {line.from === "volpe" ? <Words text={line.text} close={close} /> : line.text}
              </Bubble>
            ),
          )}
          {waiting && (
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
          {!started && (
            <ul className="flex max-w-[58%] flex-col items-start gap-2 sm:max-w-[60%]">
              {OPENERS.map((opener) => (
                <li key={opener}>
                  <button
                    type="button"
                    onClick={() => void ask(opener)}
                    className="rounded-full bg-intonaco/90 px-4 py-2 text-left text-lg italic ring-1 ring-accent/40 transition hover:ring-accent"
                  >
                    {opener}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={submit}
          className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-10"
        >
          <div className="flex max-w-[72%] items-end gap-2 rounded-3xl bg-intonaco/95 p-1.5 pl-4 shadow-[0_10px_30px_-18px_rgb(42_32_25/0.7)] ring-1 ring-ink/15 focus-within:ring-accent sm:max-w-[60%]">
            <label htmlFor="volpe-message" className="sr-only">
              Write to La Volpe
            </label>
            <textarea
              id="volpe-message"
              rows={1}
              value={draft}
              maxLength={MESSAGE_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
              placeholder="Write to La Volpe…"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-lg leading-snug outline-none [field-sizing:content] placeholder:text-pietra placeholder:italic"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-intonaco transition disabled:opacity-35"
            >
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
                <path d="M3 10h12M10 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function Bubble({ from, children }: { from: "guest" | "volpe"; children: ReactNode }) {
  return (
    <div
      className={`max-w-[58%] rounded-2xl px-4 py-3 text-lg leading-snug whitespace-pre-line shadow-[0_8px_20px_-16px_rgb(42_32_25/0.6)] sm:max-w-[60%] ${
        from === "volpe"
          ? "self-start rounded-tl-sm bg-intonaco ring-1 ring-ink/10"
          : "self-start rounded-tr-sm bg-accent/12 ring-1 ring-accent/25 italic sm:ml-10"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * The table he holds out, like a reservation slip on the desk: the guest adds
 * their name, phone and email and confirms it themselves.
 */
function BookingCard({ offer, onBooked }: { offer: Offer; onBooked: (name: string) => void }) {
  const [state, setState] = useState<"idle" | "sending" | "booked">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    setState("sending");
    setProblem(null);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: offer.date,
          time: offer.time,
          partySize: offer.partySize,
          tableLabel: offer.table.label,
          occasion: offer.occasion,
          notes: offer.notes,
          name,
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
        }),
      });
      const reply = (await response.json()) as BookReply;
      if (reply.ok) {
        setState("booked");
        onBooked(name);
      } else {
        setState("idle");
        setProblem(reply.reason);
      }
    } catch {
      setState("idle");
      setProblem("The line dropped. Please try again.");
    }
  }

  const field =
    "w-full rounded-lg bg-wash/60 px-3 py-2 text-base ring-1 ring-ink/15 outline-none placeholder:text-pietra/80 focus:ring-accent disabled:opacity-60";

  return (
    <div className="relative max-w-[58%] self-start rounded-sm bg-intonaco px-4 pt-4 pb-5 shadow-[0_14px_30px_-18px_rgb(42_32_25/0.7)] ring-1 ring-ink/15 sm:max-w-[60%] sm:px-5">
      <p className="font-display text-[0.65rem] tracking-[0.26em] text-accent-ink uppercase">Prenotazione</p>
      <p className="mt-2 text-xl leading-tight italic">{spellDate(offer.date)}</p>
      <p className="mt-1 text-lg">
        {offer.time} · {offer.partySize} {offer.partySize === 1 ? "guest" : "guests"}
      </p>
      <p className="mt-1 text-base text-pietra">
        Table {offer.table.label}, {offer.table.zoneName}
        {offer.table.tags.length > 0 && ` · ${offer.table.tags.join(", ").replaceAll("-", " ")}`}
      </p>
      {offer.notes && <p className="mt-1 text-base text-pietra italic">“{offer.notes}”</p>}

      {state === "booked" ? (
        <p className="mt-4 inline-block -rotate-3 rounded-sm px-3 py-1 font-display text-sm tracking-[0.3em] text-accent-ink uppercase ring-2 ring-accent/70">
          Confermato
        </p>
      ) : (
        <form onSubmit={confirm} className="mt-4 flex flex-col gap-2">
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Your name" aria-label="Your name" className={field} disabled={state === "sending"} />
          <input name="phone" required type="tel" autoComplete="tel" placeholder="Phone" aria-label="Phone" pattern="\+?[\d\s\(\)\.\-]{6,24}" className={field} disabled={state === "sending"} />
          <input name="email" required type="email" autoComplete="email" placeholder="Email" aria-label="Email" className={field} disabled={state === "sending"} />
          {problem && <p className="text-base text-accent-ink">{problem}</p>}
          <button
            type="submit"
            disabled={state === "sending"}
            className="mt-1 rounded-full bg-accent px-4 py-2 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink disabled:opacity-60"
          >
            {state === "sending" ? "Laying the table…" : "Confirm"}
          </button>
        </form>
      )}
    </div>
  );
}
