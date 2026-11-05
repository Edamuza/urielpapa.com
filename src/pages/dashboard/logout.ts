import type { APIRoute } from "astro";
import {
  PRIVATE_HEADERS,
  clearSessionCookie,
  sameOrigin,
} from "@/lib/dashboard-auth";

export const prerender = false;

/** The dashboard's "Sign out" button posts here. */
export const POST: APIRoute = ({ request }) => {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const headers = new Headers({
    ...PRIVATE_HEADERS,
    Location: "/dashboard/login?signed-out=1",
  });
  headers.append("Set-Cookie", clearSessionCookie());
  return new Response(null, { status: 303, headers });
};

export const GET: APIRoute = () =>
  new Response(null, {
    status: 303,
    headers: { ...PRIVATE_HEADERS, Location: "/dashboard" },
  });
