import Link from "next/link";

import { SeasonSwitcher } from "@/components/season/season-switcher";

const PAGES = [{ href: "/menu", label: "La Carta" }];

/** The wordmark, the house's pages and the season switcher, at the top of every page. */
export function SiteHeader() {
  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-3 gap-y-4 px-4 py-5 sm:flex-nowrap sm:px-10">
      <Link href="/" className="group">
        <p className="font-display text-xl tracking-[0.24em] text-ink sm:text-2xl sm:tracking-[0.32em]">AUDITORE</p>
        <p className="mt-0.5 text-sm italic text-pietra">Firenze · dal 1459</p>
      </Link>
      {/* On a phone the pages take a row of their own under the wordmark. */}
      <div className="contents sm:flex sm:items-center sm:gap-8">
        <nav aria-label="The house" className="order-last w-full sm:order-none sm:w-auto">
          {/* Over the painting it sits on a slip of paper, like the switcher, so it reads in any season. */}
          <ul className="flex gap-5 sm:rounded-full sm:bg-intonaco/75 sm:px-5 sm:py-3 sm:ring-1 sm:shadow-[0_1px_0_rgb(42_32_25/0.06)] sm:ring-ink/8 sm:backdrop-blur-sm">
            {PAGES.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="ink-link font-display text-xs tracking-[0.24em] uppercase">
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SeasonSwitcher />
      </div>
    </header>
  );
}
