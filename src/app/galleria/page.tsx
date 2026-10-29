import type { Metadata } from "next";

import { GalleryWall } from "@/components/gallery/gallery-wall";
import { SiteHeader } from "@/components/site-header";
import { getGallery } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "La Galleria",
  description:
    "Inside Auditore: the vaulted dining room, the kitchen, the cellar, the terrace over Florence, and what comes to the table.",
};

export default async function GalleryPage() {
  const pictures = await getGallery();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-28 sm:px-10 sm:pt-20 lg:max-w-[min(72rem,max(40rem,calc(100vw-2*var(--fox-room))))]">
        <header className="max-w-2xl">
          <p className="font-display text-xs tracking-[0.28em] text-accent-ink uppercase">La Galleria</p>
          <h1 className="ink-in mt-5 text-5xl leading-[1.05] italic sm:text-7xl">Before you come in.</h1>
          <p className="mt-6 text-xl leading-relaxed text-ink/80">
            The room under the vault, the kitchen at the back, the cellar below and the terrace above the river, and a few
            of the things that come out to the tables.
          </p>
        </header>
        <GalleryWall pictures={pictures} />
      </main>
    </>
  );
}
