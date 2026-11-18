import type { APIRoute } from "astro";
import { BOOKING } from "@/config";
import { calendarEnabled, freeSlots } from "@/lib/calendar";

export const prerender = false;

/** Free discovery-call slots from Uriel's Google Calendar, for the contact form. */
export const GET: APIRoute = async () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        // Short cache: busy times change, but a burst of visitors shouldn't
        // each call Google.
        "Cache-Control": "public, max-age=0, s-maxage=60",
      },
    });
  if (!calendarEnabled) return json({ enabled: false, slots: [] });
  try {
    const slots = await freeSlots();
    return json({
      enabled: true,
      timeZone: BOOKING.timeZone,
      minutes: BOOKING.minutes,
      slots: slots.map(s => s.toISOString()),
    });
  } catch {
    return json({ enabled: false, slots: [] }, 503);
  }
};
