import type { DayBook } from "@/lib/admin";

export const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** The services of the day, each with the stretch of the clock its timeline covers. */
export function windows(book: DayBook) {
  return book.services.map((s) => ({
    ...s,
    from: Math.floor((minutes(s.opensAt) - 30) / 60) * 60,
    to: Math.min(24 * 60, Math.ceil((minutes(s.lastSeatingAt) + book.seatingMinutes) / 60) * 60),
  }));
}

/** Which service to open on: the one under way or next, on today; dinner otherwise. */
export function defaultService(book: DayBook): "pranzo" | "cena" {
  const spans = windows(book);
  if (book.date === book.today) {
    const now = minutes(book.now);
    const current = spans.find((s) => now < s.to);
    if (current) return current.service;
  }
  return spans.some((s) => s.service === "cena") ? "cena" : (spans[0]?.service ?? "cena");
}
