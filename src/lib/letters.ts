import "server-only";

import type { HeldBooking } from "./booking";
import { HOUSE } from "./house";
import { bookingIcs } from "./ics";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function spell(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** The confirmation, written like a note from the house on its own paper. */
function letter(booking: HeldBooking, manageUrl: string) {
  const first = escape(booking.name.split(" ")[0]);
  const guests = `${booking.partySize} ${booking.partySize === 1 ? "guest" : "guests"}`;
  return `<!doctype html><html><body style="margin:0;background:#ecdcc5;padding:32px 12px;font-family:Georgia,'EB Garamond',serif;color:#2a2019">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#efe8da;border:1px solid rgba(42,32,25,.15);border-radius:4px">
<tr><td style="padding:36px 36px 8px">
<p style="margin:0;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#8a3a1f">Auditore · Firenze · dal 1459</p>
<h1 style="margin:18px 0 0;font-size:34px;font-weight:normal;font-style:italic">A table is laid for you, ${first}.</h1>
</td></tr>
<tr><td style="padding:20px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(42,32,25,.2);border-bottom:1px solid rgba(42,32,25,.2)">
<tr><td style="padding:16px 0;font-size:20px;line-height:1.5">
<i>${spell(booking.date)}</i>, at ${booking.time}<br>${guests} · table ${booking.table.label}, ${escape(booking.table.zoneName)}
${booking.occasion ? `<br><span style="color:#6d7a76">${escape(booking.occasion)}</span>` : ""}
</td></tr></table>
</td></tr>
<tr><td style="padding:4px 36px 8px;font-size:17px;line-height:1.6">
<p style="margin:0 0 14px">The bread, the oil and the water are on the house; the rest is up to you and the nonna. The calendar file is attached.</p>
<p style="margin:0 0 26px"><a href="${manageUrl}" style="display:inline-block;background:#9a4426;color:#efe8da;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;letter-spacing:.2em;text-transform:uppercase">Change or cancel</a></p>
<p style="margin:0;font-style:italic;color:#6d7a76">${escape(HOUSE.street)}, ${escape(HOUSE.district)} · ${escape(HOUSE.phone)}</p>
</td></tr>
<tr><td style="padding:22px 36px 30px;font-size:15px;font-style:italic;color:#6d7a76">La Volpe, il capocameriere</td></tr>
</table>
<p style="margin:18px 0 0;font-size:13px;font-style:italic;color:#6d7a76">Nulla è reale, tutto è lecito: Auditore is a portfolio piece.</p>
</td></tr></table></body></html>`;
}

/**
 * Sends the guest their confirmation through Resend. Without a key the booking still
 * stands; the page shows the link and the calendar file instead.
 */
export async function sendConfirmation(booking: HeldBooking, manageUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Auditore <onboarding@resend.dev>",
      to: booking.email,
      subject: `Your table at Auditore, ${spell(booking.date)} at ${booking.time}`,
      html: letter(booking, manageUrl),
      attachments: [{ filename: "auditore.ics", content: Buffer.from(bookingIcs(booking, manageUrl)).toString("base64") }],
    }),
  });
  if (!response.ok) console.error("[booking] letter not sent", response.status, await response.text());
  return response.ok;
}
