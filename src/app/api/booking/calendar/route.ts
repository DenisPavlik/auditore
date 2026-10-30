import { getCalendar } from "@/lib/booking";

/** The days ahead, and which of them the house serves. */
export async function GET() {
  return Response.json(await getCalendar(), { headers: { "cache-control": "no-store" } });
}
