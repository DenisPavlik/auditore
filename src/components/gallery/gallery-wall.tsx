"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type GalleryPicture = {
  id: number;
  url: string;
  title: string | null;
  caption: string | null;
  alt: string;
  width: number;
  height: number;
};

// Hung by hand: each picture sits a little off true.
const TILT = [-1.2, 0.8, -0.5, 1.1, -0.9, 0.4, 1.3, -0.7];

// On a six-column wall a landscape takes two thirds of a row, a portrait the
// third beside it, and two squares share a row.
function hang({ width, height }: GalleryPicture) {
  const ratio = width / height;
  if (ratio > 1.2) return { span: "sm:col-span-4", sizes: "(min-width: 40rem) 60vw, 100vw" };
  if (ratio < 0.8) return { span: "sm:col-span-2", sizes: "(min-width: 40rem) 30vw, 100vw" };
  return { span: "sm:col-span-3", sizes: "(min-width: 40rem) 45vw, 100vw" };
}

/**
 * The paintings hung on a six-column wall. A picture opens in a lightbox that steps
 * through the others with the arrow keys or a swipe.
 */
export function GalleryWall({ pictures }: { pictures: GalleryPicture[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipeFrom = useRef<number | null>(null);

  const current = open === null ? null : pictures[open];

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + pictures.length) % pictures.length));

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  }

  function onPointerUp(event: PointerEvent) {
    if (swipeFrom.current === null) return;
    const moved = event.clientX - swipeFrom.current;
    swipeFrom.current = null;
    if (Math.abs(moved) > 50) step(moved < 0 ? 1 : -1);
  }

  return (
    <>
      <ul className="mt-14 grid grid-cols-1 items-center gap-x-10 gap-y-14 sm:grid-cols-6 lg:gap-x-14">
        {pictures.map((picture, i) => (
          <li key={picture.id} className={`reveal ${hang(picture).span}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open ${picture.title ?? "picture"}`}
              style={{ rotate: `${TILT[picture.id % TILT.length]}deg` }}
              className="group block w-full text-left transition-[rotate,translate] duration-500 hover:-translate-y-1 hover:!rotate-0 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span className="block bg-intonaco p-2 shadow-[0_18px_34px_-22px_rgb(42_32_25/0.55)] ring-1 ring-ink/10 sm:p-3">
                <Image
                  src={picture.url}
                  alt={picture.alt}
                  width={picture.width}
                  height={picture.height}
                  sizes={hang(picture).sizes}
                  // The first pictures are above the fold.
                  loading={i < 3 ? "eager" : "lazy"}
                  className="h-auto w-full"
                />
              </span>
              <span className="mt-4 block text-xl italic">{picture.title}</span>
              {picture.caption && <span className="block text-base text-pietra">{picture.caption}</span>}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onKeyDown={onKeyDown}
        onClick={(event) => event.target === event.currentTarget && setOpen(null)}
        aria-label={current?.title ?? "Gallery"}
        className="lightbox m-auto max-h-none max-w-none bg-transparent p-0 text-ink backdrop:bg-wash/90 backdrop:backdrop-blur-sm"
      >
        {current && (
          <figure
            className="flex h-[100svh] w-screen touch-pan-y flex-col items-center justify-center gap-4 px-4 py-14 select-none sm:px-20"
            onPointerDown={(event) => (swipeFrom.current = event.clientX)}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipeFrom.current = null)}
            onClick={(event) => event.target === event.currentTarget && setOpen(null)}
          >
            <span className="relative block min-h-0 flex-1 self-stretch">
              <Image
                key={current.id}
                src={current.url}
                alt={current.alt}
                fill
                sizes="100vw"
                draggable={false}
                className="lightbox-image object-contain drop-shadow-[0_20px_40px_rgb(42_32_25/0.35)]"
              />
            </span>
            <figcaption className="text-center">
              <span className="block text-2xl italic">{current.title}</span>
              {current.caption && <span className="mt-1 block text-lg text-ink/80">{current.caption}</span>}
              <span className="mt-1 block text-base text-pietra">
                {(open ?? 0) + 1} / {pictures.length}
              </span>
            </figcaption>
          </figure>
        )}
        <button
          type="button"
          onClick={() => setOpen(null)}
          aria-label="Close"
          className="fixed top-4 right-4 grid size-11 place-items-center rounded-full bg-intonaco/80 text-2xl ring-1 ring-ink/10 transition hover:text-accent-ink"
        >
          ×
        </button>
        {pictures.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous picture"
              className="fixed top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-intonaco/80 text-xl ring-1 ring-ink/10 transition hover:text-accent-ink sm:grid"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next picture"
              className="fixed top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-intonaco/80 text-xl ring-1 ring-ink/10 transition hover:text-accent-ink sm:grid"
            >
              →
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
