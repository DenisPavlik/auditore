"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import type { Done } from "@/app/admin/actions";
import { addPicture, movePicture, removePicture, updatePicture } from "@/app/admin/galleria-actions";
import type { GalleryImage } from "@/lib/gallery";

const FIELD = "w-full rounded-lg bg-intonaco px-3 py-2 ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-accent";
const LONGEST = 2000;

/** The picture shrunk in the browser to a WebP no longer than LONGEST on its long side, before it travels. */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONGEST / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the picture."))), "image/webp", 0.84));
  return { blob, width, height, preview: URL.createObjectURL(blob) };
}

function useAct(canWrite: boolean) {
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const act = (run: () => Promise<Done>, after?: () => void) =>
    start(async () => {
      setProblem(null);
      try {
        const done = await run();
        if (done.ok) after?.();
        else setProblem(done.reason);
      } catch (error) {
        setProblem(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  return { pending, problem, act, note: canWrite ? null : "Demo: try anything, the wall stays as it is." };
}

function Note({ problem, note }: { problem: string | null; note: string | null }) {
  if (!problem && !note) return null;
  return <p className={`mt-3 text-sm italic ${problem ? "text-accent-ink" : "text-pietra"}`}>{problem ?? note}</p>;
}

function Words({ picture }: { picture?: GalleryImage }) {
  return (
    <>
      <label className="mt-4 block">
        <span className="text-sm text-pietra">Name under the frame</span>
        <input name="title" required maxLength={40} defaultValue={picture?.title ?? ""} placeholder="La Cantina" className={FIELD} />
      </label>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">One line about it</span>
        <input name="caption" maxLength={120} defaultValue={picture?.caption ?? ""} placeholder="Three hundred bottles under the street." className={FIELD} />
      </label>
      <label className="mt-3 block">
        <span className="text-sm text-pietra">What it shows, for screen readers</span>
        <textarea name="alt" required rows={3} maxLength={400} defaultValue={picture?.alt ?? ""} className={FIELD} />
      </label>
    </>
  );
}

const words = (form: HTMLFormElement) => {
  const f = new FormData(form);
  return { title: String(f.get("title")), caption: String(f.get("caption")), alt: String(f.get("alt")) };
};

/** A new picture: chosen, shrunk, previewed, named, then hung. */
function Hang({ canWrite, onDone }: { canWrite: boolean; onDone: () => void }) {
  const [shrunk, setShrunk] = useState<Awaited<ReturnType<typeof shrink>> | null>(null);
  const [name, setName] = useState("");
  const { pending, problem, act, note } = useAct(canWrite);
  const input = useRef<HTMLInputElement>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setShrunk(await shrink(file));
    setName(file.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!shrunk) return;
        const form = event.currentTarget;
        act(async () => {
          // The server refuses the demo too; this only spares the upload.
          if (!canWrite) return { ok: false, reason: "The demo can look around, but not hang pictures." };
          const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quadro";
          const stored = await upload(`galleria/${slug}.webp`, shrunk.blob, { access: "public", handleUploadUrl: "/api/admin/gallery-upload", contentType: "image/webp" });
          return addPicture({ ...words(form), url: stored.url, width: shrunk.width, height: shrunk.height });
        }, onDone);
      }}
    >
      <p className="font-display text-xs tracking-[0.22em] text-accent-ink uppercase">Hang a new picture</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void choose(e.dataTransfer.files[0]);
        }}
        className="relative mt-3 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-ink/20 bg-intonaco text-pietra transition hover:border-accent"
      >
        {shrunk ? (
          // A local preview of the shrunk file, not yet anywhere to optimise from.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shrunk.preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="px-6 text-center italic">Drop a photograph here, or tap to choose one. It is shrunk to a light WebP before it travels.</span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
      {shrunk && (
        <p className="mt-2 text-sm text-pietra tabular-nums">
          {shrunk.width} × {shrunk.height}, {Math.round(shrunk.blob.size / 1024)} KB
        </p>
      )}
      <Words />
      <button
        type="submit"
        disabled={pending || !shrunk}
        className="mt-5 w-full rounded-full bg-ink py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink disabled:opacity-40"
      >
        {pending ? "Hanging…" : "Hang it on the wall"}
      </button>
      <Note problem={problem} note={note} />
    </form>
  );
}

function Edit({ picture, canWrite, onDone }: { picture: GalleryImage; canWrite: boolean; onDone: () => void }) {
  const { pending, problem, act, note } = useAct(canWrite);
  const [sure, setSure] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        act(() => updatePicture(picture.id, words(form)), onDone);
      }}
    >
      <p className="font-display text-xs tracking-[0.22em] text-pietra uppercase">On the wall</p>
      <h3 className="mt-1 text-2xl italic">{picture.title ?? "Untitled"}</h3>
      <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-ink/10">
        <Image src={picture.url} alt="" fill sizes="24rem" className="object-cover" />
      </div>
      <Words picture={picture} />
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-ink py-3 font-display text-xs tracking-[0.22em] text-intonaco uppercase transition hover:bg-accent-ink disabled:opacity-50"
      >
        Keep the changes
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => (sure ? act(() => removePicture(picture.id), onDone) : setSure(true))}
        className={`mt-2 w-full rounded-full py-2.5 font-display text-[0.68rem] tracking-[0.2em] uppercase transition ${sure ? "bg-accent-ink text-intonaco" : "text-accent-ink hover:bg-accent-ink/10"}`}
      >
        {sure ? "Yes, take it down for good" : "Take it down"}
      </button>
      <Note problem={problem} note={note} />
    </form>
  );
}

function Frame({ picture, index, count, chosen, onPick, canWrite }: { picture: GalleryImage; index: number; count: number; chosen: boolean; onPick: () => void; canWrite: boolean }) {
  const { pending, problem, act } = useAct(canWrite);
  return (
    <li className={`rounded-xl p-2 transition ${chosen ? "bg-wash ring-2 ring-accent" : "hover:bg-wash/60"}`}>
      <button type="button" onClick={onPick} className="block w-full text-left">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-md ring-1 ring-ink/10">
          <Image src={picture.url} alt="" fill sizes="(min-width: 64rem) 16rem, 45vw" className="object-cover" />
          <span className="absolute top-2 left-2 rounded-full bg-intonaco/90 px-2 font-display text-[0.65rem] tabular-nums">{index + 1}</span>
        </span>
        <span className="mt-2 block truncate text-lg italic">{picture.title ?? "Untitled"}</span>
        <span className="block truncate text-sm text-pietra">{picture.caption}</span>
      </button>
      <div className="mt-2 flex gap-1.5">
        {([-1, 1] as const).map((by) => (
          <button
            key={by}
            type="button"
            disabled={pending || (by < 0 ? index === 0 : index === count - 1)}
            onClick={() => act(() => movePicture(picture.id, by))}
            aria-label={by < 0 ? `Hang ${picture.title} earlier` : `Hang ${picture.title} later`}
            className="grid h-8 flex-1 place-items-center rounded-full ring-1 ring-ink/20 transition enabled:hover:bg-ink enabled:hover:text-intonaco disabled:opacity-25"
          >
            {by < 0 ? "←" : "→"}
          </button>
        ))}
      </div>
      {problem && <p className="mt-1 text-sm text-accent-ink italic">{problem}</p>}
    </li>
  );
}

export function Galleria({ pictures, canWrite }: { pictures: GalleryImage[]; canWrite: boolean }) {
  const [picked, setPicked] = useState<number | "new" | null>(null);
  const chosen = typeof picked === "number" ? pictures.find((p) => p.id === picked) : undefined;
  const close = () => setPicked(null);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {pictures.map((p, i) => (
          <Frame key={p.id} picture={p} index={i} count={pictures.length} chosen={picked === p.id} onPick={() => setPicked(p.id)} canWrite={canWrite} />
        ))}
        <li>
          <button
            type="button"
            onClick={() => setPicked("new")}
            className={`grid aspect-[4/3] w-full place-items-center rounded-xl border-2 border-dashed text-pietra transition hover:border-accent hover:text-ink ${picked === "new" ? "border-accent" : "border-ink/20"}`}
          >
            <span className="text-center">
              <span className="block text-3xl">+</span>
              <span className="italic">Hang a new picture</span>
            </span>
          </button>
        </li>
      </ol>
      <div className="lg:sticky lg:top-6 lg:self-start">
        {picked !== null ? (
          <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[85svh] overflow-y-auto rounded-t-2xl bg-wash p-5 shadow-[0_-20px_50px_-30px_rgb(42_32_25/0.7)] ring-1 ring-ink/10 lg:static lg:max-h-none lg:rounded-xl lg:bg-wash/70 lg:shadow-none">
            <div className="-mt-1 -mr-1 flex justify-end">
              <button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-ink/10">
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {picked === "new" ? <Hang canWrite={canWrite} onDone={close} /> : chosen ? <Edit key={chosen.id} picture={chosen} canWrite={canWrite} onDone={close} /> : null}
          </aside>
        ) : (
          <p className="hidden rounded-xl border border-dashed border-ink/20 p-5 text-pietra italic lg:block">
            The wall hangs in this order, row by row. Tap a picture to rename or take it down; the arrows move it along.
          </p>
        )}
      </div>
    </div>
  );
}
