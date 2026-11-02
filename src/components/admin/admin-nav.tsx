"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/admin", name: "Il Turno" },
  { href: "/admin/chiusure", name: "Chiusure" },
  { href: "/admin/carta", name: "Carta" },
] as const;

/** The rooms of the back office, the one you stand in marked. */
export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1">
      {PAGES.map((p) => {
        const here = path === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={here ? "page" : undefined}
            className={`rounded-full px-3 py-1 font-display text-[0.68rem] tracking-[0.18em] uppercase transition ${here ? "bg-ink text-intonaco" : "text-ink/70 hover:text-ink"}`}
          >
            {p.name}
          </Link>
        );
      })}
    </nav>
  );
}
