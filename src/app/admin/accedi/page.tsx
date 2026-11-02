import type { Metadata } from "next";

import { SignIn } from "@/components/admin/sign-in";

export const metadata: Metadata = { title: "Accedi" };

export default function Accedi() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-intonaco p-8 shadow-[0_30px_60px_-40px_rgb(42_32_25/0.6)] ring-1 ring-ink/10 sm:p-10">
        <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">Auditore · Il Libro</p>
        <h1 className="mt-4 text-4xl italic">The book of the house.</h1>
        <p className="mt-3 text-lg text-ink/75">Every table, every evening, for the people who run the floor.</p>
        <SignIn />
      </div>
    </main>
  );
}
