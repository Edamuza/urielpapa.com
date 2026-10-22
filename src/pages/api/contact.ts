import type { APIRoute } from "astro";
import {
  CONTACT_FROM_EMAIL,
  CONTACT_TO_EMAIL,
  RESEND_API_KEY,
} from "astro:env/server";
import { EMAIL_RE, rateLimited, reply, verifyTurnstile } from "@/lib/forms";

export const prerender = false;

const TOPICS: Record<string, string> = {
  work: "Work together",
  speaking: "Speaking or event",
  question: "Question about a post",
  other: "Something else",
};

/** Contact form handler (ux-ui-spec.md §5.9): validates, filters spam, emails Uriel via Resend. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData().catch(() => null);
  if (!form)
    return reply(request, 400, { message: "The form could not be read." });

  // Bots fill the hidden field; pretend it worked.
  if (String(form.get("website") ?? ""))
    return reply(request, 200, { message: "Thanks!" }, "/contact/thanks");

  // Strip control characters (CR/LF etc.) so the name can't break the subject line.
  const name = String(form.get("name") ?? "")
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 120);
  const email = String(form.get("email") ?? "")
    .trim()
    .slice(0, 200);
  const rawTopic = String(form.get("topic") ?? "other");
  const topicKey = Object.hasOwn(TOPICS, rawTopic) ? rawTopic : "other";
  const topic = TOPICS[topicKey];
  const message = String(form.get("message") ?? "")
    .trim()
    .slice(0, 5000);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please enter your name.";
  if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";
  if (message.length < 10)
    errors.message = "Please write a little more (at least 10 characters).";
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
      subject: `[urielpapa.com] ${topic}: ${name}`,
      text: `Topic: ${topic}\nName: ${name}\nEmail: ${email}\n\n${message}`,
    }),
    signal: AbortSignal.timeout(8000),
  })
    .then(res => res.ok)
    .catch(() => false); // timeout or network error
  if (!sent) {
    return reply(request, 502, {
      message: `Your message couldn't be sent right now. Please email ${CONTACT_TO_EMAIL} directly.`,
    });
  }

  return reply(
    request,
    200,
    { message: "Thanks, your message is on its way." },
    `/contact/thanks?topic=${topicKey}`
  );
};
