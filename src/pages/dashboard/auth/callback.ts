import type { APIRoute } from "astro";
import {
  PRIVATE_HEADERS,
  clearFailures,
  clearFlowCookie,
  clientAddress,
  finishGoogleSignIn,
  googleSignIn,
  lockedFor,
  recordFailure,
  sessionCookie,
} from "@/lib/dashboard-auth";

export const prerender = false;

/** Google sends the visitor back here after they pick an account. */
export const GET: APIRoute = async ({ request }) => {
  const address = clientAddress(request);
  const go = (location: string, cookies: string[] = []) => {
    const headers = new Headers({ ...PRIVATE_HEADERS, Location: location });
    for (const c of [clearFlowCookie(), ...cookies])
      headers.append("Set-Cookie", c);
    return new Response(null, { status: 303, headers });
  };
  if (!googleSignIn()) return go("/dashboard");
  if (lockedFor(address)) return go("/dashboard/login?error=locked");
  // The visitor pressed Cancel on Google's screen: not a failed attempt.
  if (new URL(request.url).searchParams.get("error"))
    return go("/dashboard/login?error=cancelled");
  const result = await finishGoogleSignIn(request);
  if (!result.ok) {
    recordFailure(address);
    return go(`/dashboard/login?error=${result.reason}`);
  }
  clearFailures(address);
  return go("/dashboard", [sessionCookie(result.email)]);
};
