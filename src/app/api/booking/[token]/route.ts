import { cancelBooking, getBooking } from "@/lib/booking";

/** The booking behind a guest's link, for the page that changes it. */
export async function GET(_request: Request, ctx: RouteContext<"/api/booking/[token]">) {
  const { token } = await ctx.params;
  const booking = await getBooking(token);
  if (!booking || booking.status !== "confirmed") return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(booking, { headers: { "cache-control": "no-store" } });
}

/** The guest gives their table back, from the link in their confirmation. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/booking/[token]">) {
  const { token } = await ctx.params;
  const result = await cancelBooking(token);
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
