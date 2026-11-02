"use client";

import { useActionState } from "react";

import { signIn } from "@/app/admin/actions";

const FIELD = "mt-1 w-full rounded-lg bg-wash/60 px-3 py-2.5 text-lg ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent";
const BUTTON = "w-full rounded-full py-3 font-display text-xs tracking-[0.22em] uppercase transition disabled:opacity-50";

export function SignIn() {
  const [problem, act, pending] = useActionState(signIn, null);
  return (
    <>
      <form action={act} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-pietra">Email</span>
          <input name="email" type="email" required autoComplete="username" className={FIELD} />
        </label>
        <label className="block">
          <span className="text-pietra">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className={FIELD} />
        </label>
        <button type="submit" disabled={pending} className={`${BUTTON} bg-ink text-intonaco hover:bg-accent-ink`}>
          Open the book
        </button>
        {problem && <p className="text-accent-ink italic">{problem}</p>}
      </form>

      <div className="mt-8 border-t border-ink/15 pt-6">
        <form action={act}>
          <input type="hidden" name="demo" value="1" />
          <button type="submit" disabled={pending} className={`${BUTTON} ring-1 ring-ink/30 hover:bg-ink hover:text-intonaco`}>
            Look around as a guest
          </button>
        </form>
        <p className="mt-3 text-center text-sm text-pietra italic">A read-only tour: try every button, nothing is written.</p>
      </div>
    </>
  );
}
