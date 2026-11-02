import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Carta } from "@/components/admin/carta";
import { getCarta } from "@/lib/admin";
import { getStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "La Carta" };

async function Kitchen() {
  await connection();
  const [carta, staff] = await Promise.all([getCarta(), getStaff()]);
  return <Carta chapters={carta.chapters} daily={carta.daily} today={carta.today} canWrite={staff?.role === "owner"} />;
}

export default function CartaPage() {
  return (
    <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 pt-8 pb-24 sm:px-10">
      <div className="rounded-2xl bg-intonaco p-5 shadow-[0_30px_60px_-40px_rgb(42_32_25/0.6)] ring-1 ring-ink/10 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pb-6">
          <div>
            <p className="font-display text-xs tracking-[0.24em] text-accent-ink uppercase">La Carta</p>
            <h1 className="mt-2 text-3xl italic sm:text-4xl">The menu, as the guests read it</h1>
            <p className="mt-2 max-w-xl text-ink/70">Every change shows on the menu page at once, and La Volpe reads the same menu.</p>
          </div>
          <Link href="/menu" target="_blank" className="rounded-full px-4 py-1.5 font-display text-[0.68rem] tracking-[0.18em] uppercase ring-1 ring-ink/20 transition hover:bg-ink hover:text-intonaco">
            See the menu ↗
          </Link>
        </div>
        <Suspense fallback={<p className="mt-8 text-xl text-pietra italic">Opening the kitchen book…</p>}>
          <Kitchen />
        </Suspense>
      </div>
    </main>
  );
}
