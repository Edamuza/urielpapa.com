/**
 * Password check for the private dashboard and its refresh endpoint: HTTP
 * Basic auth against DASHBOARD_PASSWORD (any user name). Open on localhost;
 * a 404 in production when no password is set.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { DASHBOARD_PASSWORD } from "astro:env/server";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

/** A Response to send instead of the page, or undefined when the visitor may see it. */
export function dashboardGate(request: Request): Response | undefined {
  if (!import.meta.env.PROD) return undefined;
  if (!DASHBOARD_PASSWORD)
    return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(
    " "
  );
  let given = "";
  try {
    if (scheme === "Basic" && encoded)
      given = atob(encoded).split(":").slice(1).join(":");
  } catch {
    given = "";
  }
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (timingSafeEqual(digest(given), digest(DASHBOARD_PASSWORD)))
    return undefined;
  return new Response("The dashboard needs the password.", {
    status: 401,
    headers: {
      ...PRIVATE_HEADERS,
      "WWW-Authenticate": 'Basic realm="urielpapa.com dashboard"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
