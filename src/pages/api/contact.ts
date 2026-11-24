import type { APIRoute } from "astro";
import {
  CONTACT_FROM_EMAIL,
  CONTACT_TO_EMAIL,
  RESEND_API_KEY,
} from "astro:env/server";
import {
  bookCall,
  calendarEnabled,
  formatSlot,
  isBookable,
} from "@/lib/calendar";
import { SITE } from "@/config";
import { rateLimited, reply, verifyTurnstile } from "@/lib/forms";
import {
  answerText,
  businessOf,
  composeEmail,
  parseContact,
} from "@/lib/contact.mjs";

export const prerender = false;

/** Contact form handler (ux-ui-spec.md §5.9): validates, filters spam, emails Uriel via Resend. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData().catch(() => null);
  if (!form)
    return reply(request, 400, { message: "The form could not be read." });

  // Topics, parsing, validation and the email itself: src/lib/contact.mjs.
  const contact = parseContact(key => form.get(key), SITE.url);
  const { name, email, topicKey, slot, errors } = contact;

  // Bots fill the hidden field; pretend it worked.
  if (contact.spam)
    return reply(request, 200, { message: "Thanks!" }, "/contact/thanks");

  if (Object.keys(errors).length) {
    return reply(request, 422, {
      message: "Please fix the highlighted fields.",
      errors,
    });
  }

  const ip =
    clientAddress ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimited(ip)) {
    return reply(request, 429, {
      message:
        "Too many messages in a short time. Please try again later or email me directly.",
    });
  }
  if (
    !(await verifyTurnstile(
      form.get("cf-turnstile-response") as string | null,
      ip
    ))
  ) {
    return reply(request, 400, {
      message: "The spam check didn't pass. Please try again.",
    });
  }

  if (!RESEND_API_KEY) {
    return reply(request, 503, {
      message: `The contact form isn't connected yet. Please email ${CONTACT_TO_EMAIL} directly.`,
    });
  }

  // The free discovery call: book the slot picked on the form straight into
  // Uriel's Google Calendar (with a Meet link and an invite to the sender).
  let booked = "";
  let bookingNote = "";
  if (slot && calendarEnabled) {
    const free = await isBookable(slot).catch(() => null);
    if (free === false) {
      const taken = "That time was just taken. Please pick another one.";
      return reply(request, 409, { message: taken, errors: { slot: taken } });
    }
    const when = `${formatSlot(slot)} (Philippine time)`;
    const business = businessOf(contact);
    const kind = topicKey === "speaking" ? "Speaking call" : "Discovery call";
    try {
      if (free === null) throw new Error("free/busy check failed");
      const event = await bookCall({
        start: slot,
        name,
        email,
        summary: `${kind}: ${name}${business ? ` (${business})` : ""}`,
        description: `Booked from urielpapa.com/contact\n\n${
          answerText(contact) ? `${answerText(contact)}\n\n` : ""
        }${contact.message}`,
      });
      booked = slot;
      bookingNote = `Booked call: ${when}${event.meet ? `\nMeet: ${event.meet}` : ""}`;
    } catch {
      bookingNote = `Requested call: ${when}. Booking it failed, so set it up by hand.`;
    }
  }

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_TO_EMAIL],
      reply_to: email,
      ...composeEmail(contact, bookingNote),
    }),
    signal: AbortSignal.timeout(8000),
  })
    .then(res => res.ok)
    .catch(() => false); // timeout or network error
  // A booked call already sent its calendar invite, so that counts as delivered.
  if (!sent && !booked) {
    return reply(request, 502, {
      message: `Your message couldn't be sent right now. Please email ${CONTACT_TO_EMAIL} directly.`,
    });
  }

  const redirect = `/contact/thanks?topic=${topicKey}${
    booked
      ? `&booked=${encodeURIComponent(booked)}`
      : slot
        ? "&booked=failed"
        : ""
  }`;
  return reply(
    request,
    200,
    { message: "Thanks, your message is on its way.", redirect },
    redirect
  );
};
