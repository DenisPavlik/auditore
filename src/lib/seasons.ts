export const SEASONS = ["autumn", "winter", "spring", "summer"] as const;

export type Season = (typeof SEASONS)[number];

export const RESTAURANT_TIME_ZONE = "Europe/Rome";

/** Each season is painted in one Renaissance pigment. */
export const SEASON_META: Record<
  Season,
  { label: string; italian: string; pigment: string }
> = {
  autumn: { label: "Autumn", italian: "Autunno", pigment: "Terra di Siena bruciata" },
  winter: { label: "Winter", italian: "Inverno", pigment: "Oltremare" },
  spring: { label: "Spring", italian: "Primavera", pigment: "Verde terra" },
  summer: { label: "Summer", italian: "Estate", pigment: "Giallorino" },
};

/** What each season's specials are about, in a line. */
export const SEASON_LINES: Record<Season, string> = {
  autumn: "What the vine and the woods bring in.",
  winter: "Slow pots for the cold months.",
  spring: "The first green things from the market.",
  summer: "Cold plates for the long evenings.",
};

/** Meteorological seasons, read on the restaurant's wall clock. */
export function seasonForMonth(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function seasonForDate(date: Date): Season {
  const month = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: RESTAURANT_TIME_ZONE,
      month: "numeric",
    }).format(date),
  );
  return seasonForMonth(month);
}

export function isSeason(value: unknown): value is Season {
  return typeof value === "string" && (SEASONS as readonly string[]).includes(value);
}

/**
 * A visitor's chosen season lives in sessionStorage: it follows them across
 * pages, and the next visit opens on the real season again.
 */
export const SEASON_STORAGE_KEY = "auditore:season";

/**
 * Runs in <head> before first paint so the page never flashes the wrong
 * season. Kept dependency-free because it is inlined as a string.
 */
export const seasonBootScript = `(function(){try{
var s=null;try{s=sessionStorage.getItem(${JSON.stringify(SEASON_STORAGE_KEY)})}catch(e){}
var valid=${JSON.stringify(SEASONS)};
if(valid.indexOf(s)<0){
var m=+new Intl.DateTimeFormat("en",{timeZone:${JSON.stringify(RESTAURANT_TIME_ZONE)},month:"numeric"}).format(new Date());
s=m>=3&&m<=5?"spring":m>=6&&m<=8?"summer":m>=9&&m<=11?"autumn":"winter";
}
document.documentElement.dataset.season=s;
}catch(e){}})();`;
