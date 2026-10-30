import { getBooking } from "@/lib/booking";
import { bookingIcs } from "@/lib/ics";

/** The booking as a file for the guest's calendar. */
export async function GET(request: Request, ctx: RouteContext<"/api/booking/[token]/ics">) {
  const { token } = await ctx.params;
  const booking = await getBooking(token);
  if (!booking) return new Response("Not found", { status: 404 });
  const manageUrl = `${new URL(request.url).origin}/prenota/${token}`;
  return new Response(bookingIcs(booking, manageUrl), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="auditore-${booking.date}.ics"`,
      "cache-control": "no-store",
    },
  });
}
