import { isoDate, postUrl, type Post } from "@/utils/content";
import { hubName } from "@/data/hubs";
import { SITE } from "@/config";

/**
 * Plain Markdown copy of a post for AI tools (schema-and-technical.md §3), served
 * at the post's URL plus ".md" with noindex and a canonical Link header
 * (scripts/vercel-routes.mjs).
 */
export function markdownCopy(post: Post): Response {
  const { data } = post;
  const canonical = new URL(postUrl(post), SITE.url).href;
  const lines = [
    `# ${data.title}`,
    "",
    `Original: ${canonical}`,
    `Author: ${SITE.name}`,
    `Topic: ${hubName(data.hub)}`,
    `Published: ${isoDate(data.published)}`,
    ...(data.updated ? [`Updated: ${isoDate(data.updated)}`] : []),
    ...(data.sourceUrl ? [`Source: ${data.sourceUrl}`] : []),
    "",
    `> ${data.dek}`,
    "",
    "## Key takeaways",
    "",
    ...data.takeaways.map(t => `- ${t}`),
    "",
    (post.body ?? "").trim(),
    "",
    ...(data.businessImpact.length
      ? [
          "## How this affects business",
          "",
          ...data.businessImpact.map(l => `- ${l}`),
          "",
        ]
      : []),
    ...(data.faq.length
      ? [
          "## Questions people ask",
          "",
          ...data.faq.flatMap(f => [`### ${f.q}`, "", f.a, ""]),
        ]
      : []),
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
