import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { SEASON_LINES, SEASON_META, seasonForDate, type Season } from "@/lib/seasons";

export const alt = "Auditore, a Florentine trattoria: a watercolour terrace over the Duomo, painted for the season.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The accent each season paints the house in, as in globals.css.
const ACCENT: Record<Season, string> = { autumn: "#9a4426", winter: "#2f4a86", spring: "#55633a", summer: "#7a5c0c" };

/** The card a shared link shows: the season's hero painting, with the house's name on the bare paper beside it. */
export default async function OpenGraphImage() {
  // Read at request time, so a link shared in winter shows the winter terrace.
  await connection();
  const season = seasonForDate(new Date());
  const [painting, marcellus, garamond] = await Promise.all([
    readFile(join(process.cwd(), "assets/og", `${season}.jpg`), "base64"),
    readFile(join(process.cwd(), "assets/fonts/Marcellus-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/EBGaramond-Italic.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", color: "#2a2019" }}>
        <img src={`data:image/jpeg;base64,${painting}`} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 64px", width: 540, height: "100%" }}>
          <div style={{ fontFamily: "Marcellus", fontSize: 19, letterSpacing: 6, color: ACCENT[season], textTransform: "uppercase" }}>
            Trattoria Fiorentina
          </div>
          <div style={{ fontFamily: "Marcellus", fontSize: 80, letterSpacing: 10, marginTop: 16 }}>AUDITORE</div>
          <div style={{ fontFamily: "Garamond", fontSize: 36, lineHeight: 1.2, marginTop: 20, maxWidth: 400 }}>{SEASON_LINES[season]}</div>
          <div style={{ fontFamily: "Garamond", fontSize: 24, marginTop: 30, color: ACCENT[season] }}>
            {`${SEASON_META[season].italian} · Oltrarno, Firenze · dal 1459`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Marcellus", data: marcellus, weight: 400, style: "normal" },
        { name: "Garamond", data: garamond, weight: 400, style: "italic" },
      ],
    },
  );
}
