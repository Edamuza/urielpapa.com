import type { APIRoute } from "astro";
import { BUTTONDOWN_API_KEY } from "astro:env/server";
import { EMAIL_RE, rateLimited, reply, verifyTurnstile } from "@/lib/forms";

/** Allowed shape for the signup source tag, e.g. "home" or "hub:seo". */
const FROM_RE = /^[a-z-]+(:[a-z0-9-]+)?$/;

export const prerender = false;

/** Newsletter signup: adds the address to Buttondown, which sends the double opt-in email. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData().catch(() => null);
  if (!form)
    return reply(request, 400, { message: "The form could not be read." });

  if (String(form.get("website") ?? "")) {
    return reply(
      request,
      200,
      { message: "Almost done: check your inbox to confirm." },
      "/newsletter/thanks"
    );
  }

  const email = String(form.get("email") ?? "")
    .trim()
    .slice(0, 200);
  if (!EMAIL_RE.test(email))
    return reply(request, 422, {
      message: "Please enter a valid email address.",
    });

  const ip =
    clientAddress ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimited(`nl:${ip}`, 5))
    return reply(request, 429, {
      message: "Too many attempts. Please try again later.",
    });

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

  const rawFrom = String(form.get("from") ?? "");
  const from =
    rawFrom.length <= 60 && FROM_RE.test(rawFrom) ? rawFrom : "unknown";

  if (!BUTTONDOWN_API_KEY) {
    return reply(request, 503, {
      message: "Signups aren't open yet. Please follow by RSS for now.",
    });
  }

  const failed = () =>
    reply(request, 502, {
      message: "Something went wrong. Please try again in a moment.",
    });

  let res: Response;
  try {
    res = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${BUTTONDOWN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        referrer_url: request.headers.get("referer") ?? undefined,
        tags: [from],
        ip_address: ip,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return failed(); // timeout or network error
  }

  if (!res.ok) {
    // An address that is already on the list is fine: say the same thing either way.
    const detail = await res.text().catch(() => "");
    if (!(res.status === 400 && /already/i.test(detail))) return failed();
  }
  return reply(
    request,
    200,
    { message: "Almost done: check your inbox to confirm your subscription." },
    "/newsletter/thanks"
  );
};
