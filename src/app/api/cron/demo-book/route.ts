import { fillDemoBook } from "@/lib/demo-book";

/** Once a day the made-up guests book the days that have just come into the window. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return new Response("Not for you.", { status: 401 });
  }
  return Response.json(await fillDemoBook());
}
