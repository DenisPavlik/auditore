"use client";

import { useState, useTransition } from "react";

import type { Done } from "@/app/admin/actions";
import { addDaily, deleteDish, moveDish, removeDaily, saveDish, setAvailable, type DishInput } from "@/app/admin/carta-actions";
import type { CartaChapter, CartaDaily, CartaDish } from "@/lib/admin";
import { SEASON_META, SEASONS, type Season } from "@/lib/seasons";

function addDays(date: string, days: number) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

const euro = (digits: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });
const price = (cents: number) => euro(cents % 100 ? 2 : 0).format(cents / 100);
const plain = (cents: number) => (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100));

const TAGS = [
  { tag: "vegetarian", mark: "V", label: "Vegetarian" },
  { tag: "vegan", mark: "VG", label: "Vegan" },
  { tag: "gluten-free", mark: "GF", label: "Gluten-free" },
  { tag: "for-two", mark: "×2", label: "For two, by the kilo" },
] as const;

const FIELD = "w-full rounded-lg bg-intonaco px-3 py-2 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent";
const SMALL = "rounded-full px-3 py-1.5 font-display text-[0.65rem] tracking-[0.18em] uppercase ring-1 ring-ink/25 transition enabled:hover:bg-ink enabled:hover:text-intonaco disabled:opacity-40";

function useAct(canWrite: boolean) {
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const act = (run: () => Promise<Done>, after?: () => void) =>
    start(async () => {
      setProblem(null);
      const done = await run();
      if (done.ok) after?.();
      else setProblem(done.reason);
    });
  return { pending, problem, act, note: canWrite ? null : "Demo: try anything, the menu stays as it is." };
}

function Note({ problem, note }: { problem: string | null; note: string | null }) {
  if (!problem && !note) return null;
  return <p className={`mt-3 text-sm italic ${problem ? "text-accent-ink" : "text-pietra"}`}>{problem ?? note}</p>;
}

/** The board by the door: a few dishes for one day only, chalked up the morning of. */
function Board({ today, daily, canWrite }: { today: string; daily: CartaDaily[]; canWrite: boolean }) {
  const [day, setDay] = useState(today);
  const { pending, problem, act, note } = useAct(canWrite);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const shown = daily.filter((d) => d.date === day);
  const name = (d: string, i: number) =>
    i === 0 ? "Oggi" : i === 1 ? "Domani" : new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });

  return (
    <section aria-labelledby="board-title" className="rounded-2xl bg-ink p-5 text-intonaco shadow-[0_30px_60px_-40px_rgb(42_32_25/0.9)] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.24em] text-intonaco/60 uppercase">La lavagna</p>
          <h2 id="board-title" className="mt-1 text-3xl italic">
            Oggi in cucina
          </h2>
          <p className="mt-1 text-intonaco/70">Dishes for one day only. They show at the top of the menu that day, and La Volpe knows them.</p>
        </div>
      </div>
      <div role="tablist" aria-label="Day" className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const count = daily.filter((x) => x.date === d).length;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => setDay(d)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 font-display text-[0.68rem] tracking-[0.16em] uppercase transition ${
                d === day ? "bg-intonaco text-ink" : "text-intonaco/75 ring-1 ring-intonaco/25 hover:ring-intonaco/60"
              }`}
            >
              {name(d, i)}
              {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 space-y-3">
        {shown.length === 0 && <li className="text-lg text-intonaco/55 italic">Nothing chalked up yet.</li>}
        {shown.map((d) => (
          <li key={d.id} className="flex items-baseline gap-3 text-xl">
            <span className="min-w-0">
              <span className="italic">{d.name}</span>
              {d.description && <span className="block text-base text-intonaco/65 italic">{d.description}</span>}
            </span>
            <span aria-hidden className="flex-1 translate-y-[-0.3em] border-b border-dotted border-intonaco/30" />
            <span className="tabular-nums">{price(d.priceCents)}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => removeDaily(d.id))}
              aria-label={`Wipe ${d.name} off the board`}
              className="grid size-8 shrink-0 place-items-center self-center rounded-full text-intonaco/60 transition hover:bg-intonaco/10 hover:text-intonaco"
            >
              <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-6 grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_6rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const f = new FormData(form);
          act(
            () => addDaily({ date: day, name: String(f.get("name")), description: String(f.get("description")), price: String(f.get("price")) }),
            () => form.reset(),
          );
        }}
      >
        {[
          { name: "name", placeholder: "Pici all'aglione", required: true, max: 60 },
          { name: "description", placeholder: "A line about it (optional)", required: false, max: 160 },
          { name: "price", placeholder: "€ 16", required: true, max: 8 },
        ].map((f) => (
          <input
            key={f.name}
            name={f.name}
            required={f.required}
            maxLength={f.max}
            placeholder={f.placeholder}
            aria-label={f.name}
            inputMode={f.name === "price" ? "decimal" : undefined}
            autoComplete="off"
            className="rounded-lg bg-intonaco/10 px-3 py-2 text-intonaco ring-1 ring-intonaco/20 outline-none placeholder:text-intonaco/40 focus:ring-2 focus:ring-intonaco/70"
          />
        ))}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-intonaco px-5 py-2 font-display text-[0.68rem] tracking-[0.2em] text-ink uppercase transition hover:bg-wash disabled:opacity-50"
        >
          Chalk it up
        </button>
      </form>
      {(problem ?? note) && <p className={`mt-3 text-sm italic ${problem ? "text-[#f0a58a]" : "text-intonaco/60"}`}>{problem ?? note}</p>}
    </section>
  );
}

function Marks({ tags }: { tags: string[] }) {
  return (
    <>
      {TAGS.filter((t) => tags.includes(t.tag)).map((t) => (
        <abbr key={t.tag} title={t.label} className="ml-1.5 align-[0.3em] font-display text-[0.58rem] tracking-[0.12em] text-accent-ink no-underline">
          {t.mark}
        </abbr>
      ))}
    </>
  );
}

type Editing = { dish: CartaDish | null; chapter: CartaChapter; season: Season | null };

function Row({ dish, first, last, chosen, onEdit, canWrite }: { dish: CartaDish; first: boolean; last: boolean; chosen: boolean; onEdit: () => void; canWrite: boolean }) {
  const { pending, problem, act } = useAct(canWrite);
  return (
    <li className={`group rounded-lg transition ${chosen ? "bg-wash ring-1 ring-accent" : "hover:bg-wash/50"}`}>
      <div className="flex items-center gap-2 px-2 py-2.5 sm:gap-3">
        <span className="flex flex-col">
          {([-1, 1] as const).map((by) => (
            <button
              key={by}
              type="button"
              disabled={pending || (by < 0 ? first : last)}
              onClick={() => act(() => moveDish(dish.id, by))}
              aria-label={by < 0 ? `Move ${dish.name} up` : `Move ${dish.name} down`}
              className="grid h-4 w-6 place-items-center text-pietra transition hover:text-ink disabled:opacity-20"
            >
              <svg viewBox="0 0 10 6" className="w-2.5" aria-hidden>
                <path d={by < 0 ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </span>
        <button type="button" onClick={onEdit} className={`min-w-0 flex-1 text-left ${dish.isAvailable ? "" : "opacity-45"}`}>
          <span className="flex items-baseline gap-3">
            <span className="truncate text-xl">
              {dish.name}
              <Marks tags={dish.tags} />
            </span>
            <span aria-hidden className="hidden flex-1 translate-y-[-0.3em] border-b border-dotted border-ink/25 sm:block" />
            <span className="ml-auto shrink-0 text-accent-ink tabular-nums sm:ml-0">{price(dish.priceCents)}</span>
          </span>
          {dish.description && <span className="block truncate text-ink/60 italic">{dish.description}</span>}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={!dish.isAvailable}
          disabled={pending}
          onClick={() => act(() => setAvailable(dish.id, !dish.isAvailable))}
          title={dish.isAvailable ? "Mark as finished for now" : "Back on the menu"}
          className={`shrink-0 rounded-full px-2.5 py-1 font-display text-[0.6rem] tracking-[0.16em] uppercase transition ${
            dish.isAvailable ? "text-pietra ring-1 ring-ink/15 hover:ring-ink/40" : "bg-accent-ink text-intonaco"
          }`}
        >
          Finito
        </button>
      </div>
      {problem && <p className="px-10 pb-2 text-sm text-accent-ink italic">{problem}</p>}
    </li>
  );
}

function Editor({ editing, canWrite, onClose }: { editing: Editing; canWrite: boolean; onClose: () => void }) {
  const { dish, chapter } = editing;
  const seasonal = chapter.slug === "stagione";
  const [tags, setTags] = useState<string[]>(dish?.tags ?? []);
  const [season, setSeason] = useState<Season | null>(dish?.season ?? editing.season);
  const [available, setAvailableHere] = useState(dish?.isAvailable ?? true);
  const [sure, setSure] = useState(false);
  const { pending, problem, act, note } = useAct(canWrite);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        const input: DishInput = {
          id: dish?.id ?? null,
          categoryId: chapter.id,
          name: String(f.get("name")),
          description: String(f.get("description")),
          price: String(f.get("price")),
          tags: tags as DishInput["tags"],
          season: seasonal ? season : null,
          isAvailable: available,
        };
        act(() => saveDish(input), onClose);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.22em] text-pietra uppercase">{chapter.name}</p>
          <h3 className="mt-1 text-2xl italic">{dish ? dish.name : "A new dish"}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-ink/10">
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
        <label className="block">
          <span className="text-sm text-pietra">Name</span>
          <input name="name" required maxLength={60} defaultValue={dish?.name} autoComplete="off" className={FIELD} />
        </label>
        <label className="block">
          <span className="text-sm text-pietra">Price, €</span>
          <input name="price" required inputMode="decimal" maxLength={8} defaultValue={dish ? plain(dish.priceCents) : ""} className={`${FIELD} tabular-nums`} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">As the menu describes it</span>
        <textarea name="description" rows={3} maxLength={240} defaultValue={dish?.description ?? ""} className={FIELD} />
      </label>

      <p className="mt-4 text-sm text-pietra">Marks</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {TAGS.map((t) => {
          const on = tags.includes(t.tag);
          return (
            <button
              key={t.tag}
              type="button"
              aria-pressed={on}
              onClick={() => setTags(on ? tags.filter((x) => x !== t.tag) : [...tags, t.tag])}
              className={`rounded-full px-3 py-1 text-sm transition ${on ? "bg-ink text-intonaco" : "ring-1 ring-ink/20 hover:ring-ink/40"}`}
            >
              <span className="font-display text-[0.65rem] tracking-[0.12em]">{t.mark}</span> {t.label}
            </button>
          );
        })}
      </div>

      {seasonal && (
        <>
          <p className="mt-4 text-sm text-pietra">Season</p>
          <div role="radiogroup" aria-label="Season" className="mt-1.5 grid grid-cols-4 gap-1">
            {SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={season === s}
                onClick={() => setSeason(s)}
                className={`rounded-lg py-1.5 text-sm transition ${season === s ? "bg-ink text-intonaco" : "ring-1 ring-ink/15 hover:ring-ink/40"}`}
              >
                {SEASON_META[s].label}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="mt-4 flex items-center justify-between gap-3">
        <span>
          On the menu tonight
          <span className="block text-sm text-pietra italic">Off, it shows as nothing at all, until it is back.</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={available}
          onClick={() => setAvailableHere(!available)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${available ? "bg-ink" : "bg-ink/20"}`}
        >
          <span className={`absolute top-1 size-4 rounded-full bg-intonaco transition-[left] ${available ? "left-6" : "left-1"}`} />
        </button>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-ink py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink disabled:opacity-50"
      >
        {dish ? "Keep the changes" : "Write it on the menu"}
      </button>
      {dish && (
        <button
          type="button"
          disabled={pending}
          onClick={() => (sure ? act(() => deleteDish(dish.id), onClose) : setSure(true))}
          className={`mt-2 w-full rounded-full py-2.5 font-display text-[0.68rem] tracking-[0.2em] uppercase transition ${sure ? "bg-accent-ink text-intonaco" : "text-accent-ink hover:bg-accent-ink/10"}`}
        >
          {sure ? "Yes, strike it off for good" : "Strike it off the menu"}
        </button>
      )}
      <Note problem={problem} note={note} />
    </form>
  );
}

export function Carta({ chapters, daily, today, canWrite }: { chapters: CartaChapter[]; daily: CartaDaily[]; today: string; canWrite: boolean }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [season, setSeason] = useState<Season>("autumn");

  return (
    <div className="mt-8 space-y-10">
      <Board today={today} daily={daily} canWrite={canWrite} />

      <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)_24rem]">
        <nav aria-label="Chapters" className="hidden lg:block">
          <ul className="sticky top-6 space-y-1">
            {chapters.map((c) => (
              <li key={c.id}>
                <a href={`#${c.slug}`} className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1 transition hover:bg-wash">
                  <span className="italic">{c.name}</span>
                  <span className="text-sm text-pietra tabular-nums">{c.dishes.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          {chapters.map((c) => {
            const seasonal = c.slug === "stagione";
            const dishes = seasonal ? c.dishes.filter((d) => d.season === season) : c.dishes;
            return (
              <section key={c.id} id={c.slug} aria-labelledby={`${c.slug}-title`} className="scroll-mt-6">
                <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/15 pb-2">
                  <div className="flex items-baseline gap-3">
                    <h2 id={`${c.slug}-title`} className="text-3xl italic">
                      {c.name}
                    </h2>
                    {c.subtitle && <span className="text-pietra italic">{c.subtitle}</span>}
                  </div>
                  {seasonal && (
                    <div role="tablist" aria-label="Season" className="flex gap-1">
                      {SEASONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="tab"
                          aria-selected={season === s}
                          onClick={() => setSeason(s)}
                          className={`rounded-full px-3 py-1 font-display text-[0.62rem] tracking-[0.16em] uppercase transition ${season === s ? "bg-ink text-intonaco" : "text-ink/70 hover:text-ink"}`}
                        >
                          {SEASON_META[s].italian}
                        </button>
                      ))}
                    </div>
                  )}
                </header>
                <ul className="mt-2">
                  {dishes.map((d, i) => (
                    <Row
                      key={d.id}
                      dish={d}
                      first={i === 0}
                      last={i === dishes.length - 1}
                      chosen={editing?.dish?.id === d.id}
                      onEdit={() => setEditing({ dish: d, chapter: c, season: d.season })}
                      canWrite={canWrite}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setEditing({ dish: null, chapter: c, season: seasonal ? season : null })}
                  className={`${SMALL} mt-3`}
                >
                  + Add {seasonal ? `to ${SEASON_META[season].label.toLowerCase()}` : "a dish"}
                </button>
              </section>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {editing ? (
            <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[80svh] overflow-y-auto rounded-t-2xl bg-wash p-5 shadow-[0_-20px_50px_-30px_rgb(42_32_25/0.7)] ring-1 ring-ink/10 lg:static lg:max-h-none lg:rounded-xl lg:bg-wash/70 lg:shadow-none">
              <Editor key={editing.dish?.id ?? `new${editing.chapter.id}${editing.season}`} editing={editing} canWrite={canWrite} onClose={() => setEditing(null)} />
            </aside>
          ) : (
            <p className="hidden rounded-xl border border-dashed border-ink/20 p-5 text-pietra italic lg:block">
              Tap a dish to rewrite it. The arrows change its place on the menu; Finito hides it until it is back.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
