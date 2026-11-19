import type { APIRoute } from "astro";
import { getAllBlogEntries, postUrl } from "@/utils/content";

/**
 * Every blog post and news take, for the "Which post?" search on the contact
 * form. Built with the site and fetched only when "Question about a post" is
 * picked. Drafts are never listed.
 */
export const GET: APIRoute = async () => {
  const kind = { "news-take": "News", "event-note": "Event" } as const;
  const posts = (await getAllBlogEntries()).map(p => ({
    title: p.data.title,
    url: postUrl(p),
    kind: kind[p.data.frame as keyof typeof kind] ?? "Post",
    date: p.data.published.toISOString().slice(0, 10),
  }));
  return new Response(JSON.stringify(posts), {
    headers: { "Content-Type": "application/json" },
  });
};
