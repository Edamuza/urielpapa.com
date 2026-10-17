import type { APIRoute } from "astro";
import { MACRO, SITE, SOCIALS } from "@/config";
import {
  getAllBlogEntries,
  getHubs,
  getNotes,
  noteUrl,
  postUrl,
} from "@/utils/content";

/** Generated site summary for AI tools (schema-and-technical.md §3). Drafts are never listed. */
export const GET: APIRoute = async () => {
  const hubs = await getHubs();
  const posts = (await getAllBlogEntries())
    .filter(p => !p.data.draft)
    .slice(0, 20);
  const notes = (await getNotes()).filter(n => !n.data.draft).slice(0, 10);
  const url = (p: string) => new URL(p, SITE.url).href;

  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${MACRO}`,
    "",
    `${SITE.name} is a ${SITE.jobTitle.toLowerCase()} in ${SITE.location}. Every post also has a plain Markdown copy at its own URL plus .md.`,
    "",
    "## About",
    "",
    `- [About ${SITE.name}](${url("/about")}): background, timeline and profiles`,
    `- [Projects](${url("/projects")}): systems built, described as case studies`,
    `- [Contact](${url("/contact")}): ${SITE.email}`,
    ...SOCIALS.map(s => `- [${s.label}](${s.url})`),
    "",
    "## Topics",
    "",
    ...hubs.map(
      h => `- [${h.data.title}](${url(`/topics/${h.id}`)}): ${h.data.summary}`
    ),
    "",
    "## Latest posts",
    "",
    ...(posts.length
      ? posts.map(
          p => `- [${p.data.title}](${url(postUrl(p))}): ${p.data.description}`
        )
      : ["- The first posts are being written."]),
    ...(notes.length
      ? [
          "",
          "## Latest notes",
          "",
          ...notes.map(
            n =>
              `- [${n.data.title}](${url(noteUrl(n))}): ${n.data.description}`
          ),
        ]
      : []),
    "",
    "## Optional",
    "",
    `- [RSS feed](${url("/rss.xml")})`,
    `- [Sitemap](${url("/sitemap-index.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
