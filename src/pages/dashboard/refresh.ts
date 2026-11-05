import type { APIRoute } from "astro";
import { dashboardGate } from "@/lib/dashboard-auth";
import { SEARCH } from "@/lib/dashboard";
import { refreshSearchData, refreshSetup } from "@/lib/search-refresh";
import { listPages } from "@/lib/site-stats";
import { SITE } from "@/config";

export const prerender = false;

const back = (params: Record<string, string>) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: `/dashboard?${new URLSearchParams(params)}#search`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });

/**
 * The dashboard's "Refresh search data" button posts here. It reads Search
 * Console and Bing, commits the snapshot to GitHub (Vercel then redeploys),
 * and sends the browser back to the dashboard with a short result note.
 */
export const POST: APIRoute = async ({ request }) => {
  const blocked = dashboardGate(request);
  if (blocked) return blocked;
  // Only the dashboard's own form may trigger a refresh.
  const origin = request.headers.get("origin");
  if (
    import.meta.env.PROD &&
    origin &&
    origin !== SITE.url &&
    origin !== new URL(request.url).origin
  )
    return new Response("Forbidden", { status: 403 });
  const setup = refreshSetup();
  if (!setup.ready)
    return back({
      refresh: "error",
      note: `Not set up yet. Missing in Vercel: ${setup.missing.join(", ")}.`,
    });
  try {
    const notes = await refreshSearchData([...(await listPages())], SEARCH);
    return back({ refresh: "ok", note: notes.join(" ") });
  } catch (error) {
    return back({
      refresh: "error",
      note: String(error instanceof Error ? error.message : error).slice(
        0,
        300
      ),
    });
  }
};

export const GET: APIRoute = () =>
  new Response(null, { status: 303, headers: { Location: "/dashboard" } });
