import type { APIRoute } from "astro";
import { dashboardGate, sameOrigin } from "@/lib/dashboard-auth";
import { SEARCH } from "@/lib/dashboard";
import {
  refreshSearchData,
  refreshSetup,
  type RefreshStep,
} from "@/lib/search-refresh";
import { listPages } from "@/lib/site-stats";

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

/** One line of the progress stream the dashboard's script reads. */
type StreamLine =
  | ({ type: "step" } & RefreshStep)
  | {
      type: "done";
      /** partial: saved, but at least one source failed and kept old numbers. */
      status: "ok" | "partial" | "error";
      note: string;
      commit?: string;
    };

const errorNote = (error: unknown) =>
  String(error instanceof Error ? error.message : error).slice(0, 300);

/**
 * With JavaScript, the dashboard asks for application/x-ndjson and gets one
 * JSON line per step, then a final "done" line, so it can show a progress
 * bar. Without it, the form post gets a redirect back with the result note.
 */
function stream(pages: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: StreamLine) =>
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      try {
        const { notes, failed, commit } = await refreshSearchData(
          pages,
          SEARCH,
          s => send({ type: "step", ...s })
        );
        send({
          type: "done",
          status: failed.length ? "partial" : "ok",
          note: [...failed, ...notes].join(" "),
          commit,
        });
      } catch (error) {
        send({ type: "done", status: "error", note: errorNote(error) });
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/**
 * The dashboard's "Refresh search data" button posts here. It reads Search
 * Console and Bing, commits the snapshot to GitHub (Vercel then redeploys),
 * and reports back: as a progress stream for the dashboard's script, or as
 * a redirect with a short result note for a plain form post.
 */
export const POST: APIRoute = async ({ request }) => {
  const blocked = dashboardGate(request);
  if (blocked) return blocked;
  // Only the dashboard's own form may trigger a refresh.
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const setup = refreshSetup();
  const wantsStream = (request.headers.get("accept") ?? "").includes(
    "application/x-ndjson"
  );
  if (!setup.ready) {
    const note = `Not set up yet. Missing in Vercel: ${setup.missing.join(", ")}.`;
    return wantsStream
      ? new Response(
          JSON.stringify({ type: "done", status: "error", note }) + "\n",
          {
            headers: {
              "Content-Type": "application/x-ndjson; charset=utf-8",
              "Cache-Control": "no-store",
            },
          }
        )
      : back({ refresh: "error", note });
  }
  const pages = [...(await listPages())];
  if (wantsStream) return stream(pages);
  try {
    const { notes, failed } = await refreshSearchData(pages, SEARCH);
    return back({
      refresh: failed.length ? "partial" : "ok",
      note: [...failed, ...notes].join(" "),
    });
  } catch (error) {
    return back({ refresh: "error", note: errorNote(error) });
  }
};

export const GET: APIRoute = () =>
  new Response(null, { status: 303, headers: { Location: "/dashboard" } });
