import { revalidateTag } from "next/cache";

import { fillDemoBook } from "@/lib/demo-book";

/** Once a day the made-up guests book the days that have just come into the window, and the board is chalked. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return new Response("Not for you.", { status: 401 });
  }
  const filled = await fillDemoBook();
  if (filled.chalked) revalidateTag("daily", { expire: 0 });
  return Response.json(filled);
}
