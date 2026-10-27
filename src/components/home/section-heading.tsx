import type { ReactNode } from "react";

/** A small Roman-capital eyebrow over an italic Garamond title, the way every section opens. */
export function SectionHeading({ id, eyebrow, children }: { id: string; eyebrow: ReactNode; children: ReactNode }) {
  return (
    <header>
      <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-4 text-4xl leading-tight text-balance italic sm:text-5xl">
        {children}
      </h2>
    </header>
  );
}

/** A pen stroke between sections: a hairline with a small lozenge of the season's pigment. */
export function Flourish({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-4 text-accent ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-ink/25" />
      <svg viewBox="0 0 20 10" className="h-2.5 w-5">
        <path d="M0 5 L10 0.5 L20 5 L10 9.5 Z" fill="currentColor" fillOpacity=".75" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-ink/25" />
    </div>
  );
}
