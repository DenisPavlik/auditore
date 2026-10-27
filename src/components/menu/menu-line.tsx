import { formatPrice, type MenuItem } from "@/lib/menu";

/** Dietary marks, as a waiter would pencil them beside a dish. */
export const MARKS: Record<string, { mark: string; label: string }> = {
  vegan: { mark: "VG", label: "Vegan" },
  vegetarian: { mark: "V", label: "Vegetarian" },
  "gluten-free": { mark: "GF", label: "Gluten-free" },
};

/**
 * One dish: its name, a dotted leader to the price, and a line of description.
 * `pencil` is a note the kitchen has scribbled beside it.
 */
export function MenuLine({ item, note, pencil }: { item: MenuItem; note?: string; pencil?: string }) {
  const marks = item.tags.filter((tag) => tag in MARKS);
  return (
    <li className="reveal">
      <p className="flex items-baseline gap-3 text-2xl">
        <span>
          {item.name}
          {marks.map((tag) => (
            <abbr
              key={tag}
              title={MARKS[tag].label}
              className="ml-2 align-[0.35em] font-display text-[0.6rem] tracking-[0.15em] text-accent-ink no-underline"
            >
              {MARKS[tag].mark}
            </abbr>
          ))}
        </span>
        {/* A dotted leader to the price, as on a written menu. */}
        <span aria-hidden className="flex-1 translate-y-[-0.3em] border-b border-dotted border-ink/30" />
        <span className="text-accent-ink tabular-nums">
          {formatPrice(item.priceCents)}
          {note && <span className="ml-1 text-base text-pietra italic">{note}</span>}
        </span>
      </p>
      {item.description && <p className="mt-1 max-w-2xl text-lg text-ink/70 italic">{item.description}</p>}
      {pencil && (
        <p className="mt-3 flex max-w-xl origin-left -rotate-1 items-start gap-2 text-lg leading-snug text-accent-ink italic">
          {/* A quick hooked arrow, drawn in one stroke. */}
          <svg aria-hidden viewBox="0 0 28 20" className="mt-0.5 h-4 w-6 shrink-0">
            <path
              d="M3 2c-1 7 3 12 20 11m-5-5 5 5-6 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {pencil}
        </p>
      )}
    </li>
  );
}
