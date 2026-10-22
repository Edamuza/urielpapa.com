/** Shared helpers for the two on-demand form endpoints. */
import { PUBLIC_TURNSTILE_SITE_KEY } from "astro:env/client";
import { TURNSTILE_SECRET_KEY } from "astro:env/server";

export const wantsJson = (request: Request) =>
  (request.headers.get("accept") ?? "").includes("application/json");

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Plain HTML reply for browsers that submitted the form without JavaScript. */
export function htmlMessage(title: string, message: string, status = 200) {
  const esc = (s: string) =>
    s.replace(
      /[&<>"]/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
    );
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#0a0a0a;background:#fff}a{color:inherit}</style></head><body><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a href="javascript:history.back()">Go back</a> · <a href="/">Home</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export function reply(
  request: Request,
  status: number,
  body: { message: string; errors?: Record<string, string> },
  redirect?: string
) {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (status < 400 && redirect) {
    return new Response(null, { status: 303, headers: { Location: redirect } });
  }
  return htmlMessage(
    status < 400 ? "Done" : "Something went wrong",
    body.message,
    status
  );
}

// Best-effort rate limit per IP. Serverless instances don't share memory, so
// this is per instance only: Turnstile and the honeypot do most of the work;
// this only stops bursts. Expired keys are swept so the map can't grow forever.
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  for (const [k, times] of hits) {
    if (!times.some(t => now - t < windowMs)) hits.delete(k);
  }
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

/**
 * Cloudflare Turnstile check.
 * - Both keys set: verify the token with Cloudflare (8 s timeout = fail).
 * - Site key set but secret missing: misconfigured, so fail closed.
 * - Neither set: allow; the honeypot and rate limit are the only spam filters.
 */
export async function verifyTurnstile(token: string | null, ip: string) {
  if (!TURNSTILE_SECRET_KEY) return !PUBLIC_TURNSTILE_SITE_KEY;
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: ip,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // timeout or network error
  }
}
