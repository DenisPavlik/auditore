import { InkBlots } from "@/components/atmosphere/ink-blots";
import { SeasonParticles } from "@/components/atmosphere/season-particles";
import { LaVolpe } from "@/components/volpe/la-volpe";

/** The guest's house: the fox at the desk, the season drifting past. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <footer className="px-4 py-8 text-center text-sm text-pietra italic sm:px-10">
        Nulla è reale, tutto è lecito.
      </footer>
      <LaVolpe />
      <SeasonParticles layer="back" />
      <SeasonParticles layer="front" />
      <InkBlots />
    </>
  );
}
