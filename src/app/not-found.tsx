import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Non c'è", robots: { index: false } };

/** A page that was never there: the cat on the windowsill hasn't seen it either. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-12 pb-28 sm:px-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">404 · Non c&apos;è</p>
          <h1 className="ink-in mt-5 text-5xl leading-[1.05] italic sm:text-7xl">No table by that name.</h1>
          <p className="mt-6 max-w-md text-xl leading-relaxed text-ink/80">
            The page you asked for isn&apos;t in the house. Perhaps it was moved, or perhaps the cat sat on it.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="rounded-full bg-ink px-6 py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink">
              Back to the door
            </Link>
            <Link href="/prenota" className="rounded-full px-6 py-3 font-display text-xs tracking-[0.22em] uppercase ring-1 ring-ink/30 transition hover:bg-ink hover:text-intonaco">
              Book a table
            </Link>
          </div>
        </div>
        <div className="relative aspect-square -rotate-2 overflow-hidden rounded-[4px] shadow-[0_30px_60px_-35px_rgb(42_32_25/0.7)] ring-8 ring-intonaco">
          <Image src="/gallery/gatto.webp" alt="A ginger cat asleep on a sunny windowsill in a Florentine lane." fill sizes="(min-width: 48rem) 40vw, 90vw" className="object-cover" priority />
        </div>
      </main>
    </>
  );
}
