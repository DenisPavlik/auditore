"use client";

import { useEffect, useState } from "react";

export type Chapter = { slug: string; numeral: string; name: string };

/**
 * The menu's chapters in the page margin, the one being read marked in the
 * season's pigment. On narrow screens it lies across the top and scrolls sideways.
 */
export function ChapterIndex({ chapters }: { chapters: Chapter[] }) {
  const [reading, setReading] = useState(chapters[0]?.slug);

  useEffect(() => {
    // A chapter counts as read once its heading passes the upper third of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((entry) => entry.isIntersecting);
        if (seen.length) setReading(seen[0].target.id);
      },
      { rootMargin: "0px 0px -66% 0px" },
    );
    for (const chapter of chapters) {
      const el = document.getElementById(chapter.slug);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <nav aria-label="Chapters of the menu">
      <ol className="flex gap-6 overflow-x-auto pb-2 [scrollbar-width:none] lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
        {chapters.map((chapter) => {
          const current = chapter.slug === reading;
          return (
            <li key={chapter.slug} className="shrink-0">
              <a
                href={`#${chapter.slug}`}
                aria-current={current ? "location" : undefined}
                className="group flex items-baseline gap-3 text-lg text-ink/60 transition-colors hover:text-ink aria-[current]:text-accent-ink"
              >
                <span className="w-7 font-display text-xs tracking-[0.15em] text-pietra group-aria-[current]:text-accent">
                  {chapter.numeral}
                </span>
                <span className="italic">{chapter.name}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
