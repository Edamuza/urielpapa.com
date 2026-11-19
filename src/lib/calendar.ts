/**
 * Google Calendar booking for the free discovery call.
 *
 * Uses an OAuth refresh token for Uriel's own Google account (made once with
 * scripts/google-calendar-token.mjs), so events land in his calendar with a
 * Google Meet link and an invite to the visitor. Without the three
 * GOOGLE_CALENDAR_* secrets, `calendarEnabled` is false and the contact form
 * falls back to asking for good call times.
 */
import {
  GOOGLE_CALENDAR_CLIENT_ID,
  GOOGLE_CALENDAR_CLIENT_SECRET,
  GOOGLE_CALENDAR_ID,
  GOOGLE_CALENDAR_REFRESH_TOKEN,
} from "astro:env/server";
import { BOOKING } from "@/config";

export const calendarEnabled = Boolean(
  GOOGLE_CALENDAR_CLIENT_ID &&
  GOOGLE_CALENDAR_CLIENT_SECRET &&
  GOOGLE_CALENDAR_REFRESH_TOKEN
);

const API = "https://www.googleapis.com/calendar/v3";
const MINUTE = 60_000;
const offsetMs = (() => {
  const m = /^([+-])(\d\d):(\d\d)$/.exec(BOOKING.utcOffset);
  if (!m) return 0;
  const ms = (Number(m[2]) * 60 + Number(m[3])) * MINUTE;
  return m[1] === "-" ? -ms : ms;
})();

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now() + MINUTE) return token.value;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  token = {
    value: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return token.value;
}

async function google<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}`);
  return (await res.json()) as T;
}

/** Every start time people may book, before checking the calendar. */
export function candidateSlots(now = new Date()): Date[] {
  const earliest = now.getTime() + BOOKING.leadHours * 60 * MINUTE;
  const [[startH, startM], [endH, endM]] = BOOKING.hours;
  const slots: Date[] = [];
  // "Local midnight" of today in the booking time zone, as a UTC timestamp.
  const local = new Date(now.getTime() + offsetMs);
  for (let d = 0; d <= BOOKING.daysAhead; d++) {
    const day = new Date(
      Date.UTC(
        local.getUTCFullYear(),
        local.getUTCMonth(),
        local.getUTCDate() + d
      )
    );
    if (!BOOKING.days.includes(day.getUTCDay())) continue;
    const first = (startH * 60 + startM) * MINUTE;
    const last = (endH * 60 + endM) * MINUTE - BOOKING.minutes * MINUTE;
    for (let t = first; t <= last; t += BOOKING.minutes * MINUTE) {
      const at = day.getTime() + t - offsetMs;
      if (at >= earliest) slots.push(new Date(at));
    }
  }
  return slots;
}

type Busy = { start: string; end: string }[];

async function busyBetween(from: Date, to: Date): Promise<Busy> {
  const data = await google<{
    calendars: Record<string, { busy: Busy }>;
  }>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      timeZone: BOOKING.timeZone,
      items: [{ id: GOOGLE_CALENDAR_ID }],
    }),
  });
  return Object.values(data.calendars)[0]?.busy ?? [];
}

const clashes = (slot: Date, busy: Busy) => {
  const pad = BOOKING.bufferMinutes * MINUTE;
  const start = slot.getTime() - pad;
  const end = slot.getTime() + BOOKING.minutes * MINUTE + pad;
  return busy.some(
    b => new Date(b.start).getTime() < end && new Date(b.end).getTime() > start
  );
};

/** Start times that are free in the calendar right now. */
export async function freeSlots(now = new Date()): Promise<Date[]> {
  const all = candidateSlots(now);
  if (!all.length) return [];
  const busy = await busyBetween(
    all[0],
    new Date(all.at(-1)!.getTime() + 2 * 60 * MINUTE)
  );
  return all.filter(s => !clashes(s, busy));
}

/** Checks a requested start time is one we offer and still free. */
export async function isBookable(iso: string, now = new Date()) {
  const slot = new Date(iso);
  if (Number.isNaN(slot.getTime())) return false;
  if (!candidateSlots(now).some(s => s.getTime() === slot.getTime()))
    return false;
  const pad = (BOOKING.bufferMinutes + BOOKING.minutes) * MINUTE;
  const busy = await busyBetween(
    new Date(slot.getTime() - pad),
    new Date(slot.getTime() + pad)
  );
  return !clashes(slot, busy);
}

/** Books the call: a calendar event with a Meet link, inviting the visitor. */
export async function bookCall(opts: {
  start: string;
  name: string;
  email: string;
  summary: string;
  description: string;
}) {
  const start = new Date(opts.start);
  const end = new Date(start.getTime() + BOOKING.minutes * MINUTE);
  const event = await google<{ htmlLink?: string; hangoutLink?: string }>(
    `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: opts.summary,
        description: opts.description,
        start: { dateTime: start.toISOString(), timeZone: BOOKING.timeZone },
        end: { dateTime: end.toISOString(), timeZone: BOOKING.timeZone },
        attendees: [{ email: opts.email, displayName: opts.name }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: true },
      }),
    }
  );
  return { meet: event.hangoutLink, link: event.htmlLink };
}

/** "Thu 20 Nov, 2:30 PM" in the booking time zone. */
export const formatSlot = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: BOOKING.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
