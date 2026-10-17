import type { APIRoute } from "astro";
import { getEntry } from "astro:content";
import { SHOW_DRAFTS } from "@/config";
import { postUrl } from "@/utils/content";

export const prerender = false;

/**
 * Keystatic's "Preview" link for the blog collection (keystatic.config.ts).
 * Posts, news takes and event notes live under different sections, and
 * previewUrl only knows the slug, so this looks up the entry's format and
 * redirects to its real URL. Drafts only resolve where SHOW_DRAFTS is on.
 */
export const GET: APIRoute = async ({ params, redirect }) => {
  const post = params.slug ? await getEntry("blog", params.slug) : undefined;
  if (!post || (post.data.draft && !SHOW_DRAFTS)) {
    return new Response("Not found. Save the entry first, or it is a draft.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }
  return redirect(postUrl(post), 302);
};
