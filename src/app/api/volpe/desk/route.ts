import { getHours, getTerraceStatus, HOUSE } from "@/lib/house";

export type Desk = {
  house: typeof HOUSE;
  hours: Awaited<ReturnType<typeof getHours>>;
  terrace: Awaited<ReturnType<typeof getTerraceStatus>>;
};

/** What La Volpe knows by heart, fetched when a guest first opens his desk. */
export async function GET() {
  const [hours, terrace] = await Promise.all([getHours(), getTerraceStatus()]);
  return Response.json({ house: HOUSE, hours, terrace } satisfies Desk);
}
