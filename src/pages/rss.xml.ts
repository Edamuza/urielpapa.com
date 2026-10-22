import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { render } from "astro:content";
import mdxRenderer from "@astrojs/mdx/server.js";
import { SITE } from "@/config";
import { hubName } from "@/data/hubs";
import { mdxComponents } from "@/components/mdx";
import { getAllBlogEntries, getNotes, noteUrl, postUrl } from "@/utils/content";

/** Escapes text for HTML inside the feed's content. */
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Full-content feed of posts and notes. Drafts are never included. */
export const GET: APIRoute = async () => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: mdxRenderer, name: "@astrojs/mdx" });

  const posts = (await getAllBlogEntries()).filter(p => !p.data.draft);
  const notes = (await getNotes()).filter(n => !n.data.draft);

  const entries = [
    ...posts.map(p => ({
      entry: p,
      link: postUrl(p),
      title: p.data.title,
      description: p.data.description,
      // pubDate is when the post first went out, not when it was last edited.
      date: p.data.published,
      hub: p.data.hub,
      takeaways: p.data.takeaways,
    })),
    ...notes.map(n => ({
      entry: n,
      link: noteUrl(n),
      title: n.data.title,
      description: n.data.description,
      date: n.data.published,
      hub: n.data.hub,
      takeaways: [] as string[],
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const items = await Promise.all(
    entries.map(async e => {
      const { Content } = await render(e.entry);
      const html = await container.renderToString(Content, {
        props: { components: mdxComponents },
      });
      const takeaways = e.takeaways.length
        ? `<h2>Key takeaways</h2><ul>${e.takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
        : "";
      const url = new URL(e.link, SITE.url).href;
      return {
        link: url,
        title: e.title,
        description: e.description,
        pubDate: e.date,
        categories: [hubName(e.hub)],
        content: `${takeaways}${html}<p><a href="${url}">Read on urielpapa.com</a></p>`,
      };
    })
  );

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: SITE.url,
    items,
    customData: `<language>en</language>`,
  });
};
