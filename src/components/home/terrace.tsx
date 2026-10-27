import { getTerraceStatus } from "@/lib/house";

import { SectionHeading } from "./section-heading";

/** Whether the Terrazza is laid today, read from its season dates and the day's closures. */
export async function Terrace() {
  const status = await getTerraceStatus();

  const [title, body] = status.open
    ? status.lastDays
      ? ["Aperta, for the last days of the season.", `Tables under the pergola until ${status.closesOn}. After that the terrace sleeps until spring.`]
      : ["Aperta.", `Lunch and dinner under the pergola, every day we are open, until ${status.closesOn}.`]
    : status.reason === "season"
      ? ["Chiusa fino a primavera.", `The vine is bare and the chairs are stacked. The terrace opens again on ${status.opensOn}; until then La Sala keeps the fire lit.`]
      : ["Chiusa oggi.", status.note ?? "Rain over the Oltrarno: today every table is laid indoors."];

  return (
    <section
      aria-labelledby="terrace-title"
      className="relative overflow-hidden rounded-[4px] bg-intonaco/70 px-6 py-10 ring-1 ring-ink/10 sm:px-12 sm:py-14"
    >
      {/* A wash of the season's pigment pooling in one corner, like the paintings. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]"
      />
      <SectionHeading
        id="terrace-title"
        eyebrow={
          <span className="inline-flex items-center gap-3">
            <span
              aria-hidden
              className={`size-2 rounded-full ${status.open ? "bg-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_20%,transparent)]" : "bg-pietra/60"}`}
            />
            Terrazza Monteriggioni
          </span>
        }
      >
        {title}
      </SectionHeading>
      <p className="mt-5 max-w-xl text-xl leading-relaxed text-ink/80">{body}</p>
    </section>
  );
}
