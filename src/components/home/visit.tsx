import Link from "next/link";

import { getHours, HOUSE } from "@/lib/house";

import { SectionHeading } from "./section-heading";

const SERVICE_NAMES = { pranzo: "Pranzo", cena: "Cena" };

/** Hours, the address and the way to book. */
export async function Visit() {
  const hours = await getHours();

  return (
    <section aria-labelledby="visit-title" id="visit" className="scroll-mt-10">
      <SectionHeading id="visit-title" eyebrow="Orari e Indirizzo">
        Come and sit down.
      </SectionHeading>

      <div className="mt-10 grid items-start gap-12 md:grid-cols-[3fr_2fr]">
        <div>
          <dl className="divide-y divide-ink/10 border-y border-ink/10">
            {hours.map((row) => (
              <div key={row.days} className="grid gap-1 py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
                <dt className="text-xl">{row.days}</dt>
                <dd className="text-lg text-ink/75">
                  {row.services.length === 0 ? (
                    <span className="italic text-pietra">Chiuso, the kitchen rests</span>
                  ) : (
                    row.services.map((service) => (
                      <p key={service.name}>
                        <span className="inline-block w-20 font-display text-xs tracking-[0.2em] text-accent-ink uppercase">
                          {SERVICE_NAMES[service.name]}
                        </span>
                        <span className="tabular-nums">
                          {service.opensAt} – {service.lastSeatingAt}
                        </span>
                      </p>
                    ))
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-base text-pietra italic">
            The later time is the last seating; the kitchen stays open after it.
          </p>
        </div>

        <div>
          <address className="text-xl leading-relaxed not-italic">
            {HOUSE.street}
            <br />
            {HOUSE.district}, {HOUSE.city}
          </address>
          <p className="mt-6 text-lg leading-relaxed">
            <a href={`tel:${HOUSE.phone.replaceAll(" ", "")}`} className="ink-link">
              {HOUSE.phone}
            </a>
            <br />
            <a href={`mailto:${HOUSE.email}`} className="ink-link">
              {HOUSE.email}
            </a>
          </p>
          <Link
            href="/prenota"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-accent px-7 py-3.5 font-display text-sm tracking-[0.22em] text-intonaco uppercase shadow-[0_10px_24px_-14px_var(--accent)] transition hover:bg-accent-ink"
          >
            Prenota un tavolo
          </Link>
          <p className="mt-3 text-base text-pietra italic">
            Choose your own table on the plan, or call and we&rsquo;ll choose it for you.
          </p>
        </div>
      </div>
    </section>
  );
}
