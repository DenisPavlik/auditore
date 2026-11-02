"use client";

import { useRouter } from "next/navigation";

/** Any day in the book, from the calendar the browser already has. */
export function DayPicker({ date }: { date: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      aria-label="Go to a day"
      defaultValue={date}
      onChange={(event) => event.target.value && router.push(`/admin?d=${event.target.value}`)}
      className="rounded-full bg-intonaco px-3 py-1 font-display text-xs tracking-[0.1em] ring-1 ring-ink/20 outline-none focus:ring-2 focus:ring-accent"
    />
  );
}
