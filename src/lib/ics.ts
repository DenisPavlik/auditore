import { HOUSE } from "./house";

import type { HeldBooking } from "./booking";

const stamp = (at: Date) => at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// Commas, semicolons and backslashes are separators in iCalendar text.
const text = (value: string) => value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** The booking as a calendar entry, with the link to change it in the notes. */
export function bookingIcs(booking: HeldBooking, manageUrl: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Auditore//Prenotazioni//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@auditore`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(booking.endsAt)}`,
    `SUMMARY:${text(`Dinner at Auditore, table ${booking.table.label}`)}`,
    `LOCATION:${text(`Auditore, ${HOUSE.street}, ${HOUSE.city}`)}`,
    `DESCRIPTION:${text(`${booking.partySize} at table ${booking.table.label}, ${booking.table.zoneName}.\nChange or cancel: ${manageUrl}`)}`,
    `URL:${manageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
