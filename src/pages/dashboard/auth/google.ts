import type { APIRoute } from "astro";
import {
  PRIVATE_HEADERS,
  clientAddress,
  googleSignIn,
  lockedFor,
  startGoogleSignIn,
} from "@/lib/dashboard-auth";

export const prerender = false;

/** "Sign in with Google" on the sign-in page links here; it sends the visitor to Google. */
export const GET: APIRoute = ({ request }) => {
  if (!googleSignIn())
    return new Response(null, {
      status: 303,
      headers: { ...PRIVATE_HEADERS, Location: "/dashboard" },
    });
  if (lockedFor(clientAddress(request)))
    return new Response(null, {
      status: 303,
      headers: {
        ...PRIVATE_HEADERS,
        Location: "/dashboard/login?error=locked",
      },
    });
  const { location, cookie } = startGoogleSignIn(request);
  const headers = new Headers({ ...PRIVATE_HEADERS, Location: location });
  headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
};
