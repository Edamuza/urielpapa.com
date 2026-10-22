import { isoDate, postUrl, projectUrl, type Post } from "@/utils/content";
import { hubName } from "@/data/hubs";
import { SITE } from "@/config";

/** Value of a JSX attribute: name="…", name='…', name={'…'}, name={"…"} or name={`…`}. */
function jsxAttr(attrs: string, name: string): string | undefined {
  const match = new RegExp(
    `(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)'|\\{\\s*(?:"([^"]*)"|'([^']*)'|\`([^\`]*)\`)\\s*\\})`
  ).exec(attrs);
  return match?.slice(1).find(v => v !== undefined);
}

/** Text that is safe inside Markdown link text. */
const linkText = (text: string) => text.replace(/([[\]\\])/g, "\\$1");

/** A component's children as a blockquote that starts with a bold label. */
function blockquote(label: string, inner: string, after: string[] = []) {
  // Remove the indent the MDX source uses inside the component, keeping nested lists.
  const lines = inner.split("\n").map(l => l.trimEnd());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  const indent = Math.min(
    ...lines.filter(Boolean).map(l => l.length - l.trimStart().length)
  );
  for (let i = 0; i < lines.length; i++) lines[i] = lines[i].slice(indent);
  // The label shares the first line unless that line starts a list, heading, quote or code block.
  if (lines.length && !/^([-*+#>|]|\d+[.)]\s|```)/.test(lines[0])) {
    lines[0] = `**${label}:** ${lines[0]}`;
  } else {
    lines.unshift(`**${label}:**`, "");
  }
  return [...lines, ...after].map(l => (l ? `> ${l}` : ">")).join("\n");
}

const CALLOUT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
};

/** Rewrites the MDX components and imports in a post body as plain Markdown. */
/** Images point at source files the .md copy cannot serve; keep their alt text instead. */
const localImagesToText = (text: string) =>
  text.replace(
    /!\[([^\]]*)\]\((?!https?:)[^)]+\)/g,
    (_, alt: string) => `*Image: ${alt}*`
  );

function mdxToMarkdown(body: string): string {
  // Leave fenced code blocks untouched; they may show the component syntax itself.
  return body
    .split(/(^```[\s\S]*?^```[^\n]*$)/m)
    .map((part, i) => (i % 2 ? part : localImagesToText(convertProse(part))))
    .join("");
}

function convertProse(text: string): string {
  return text
    .replace(/^import\s.*\sfrom\s.*$/gm, "")
    .replace(
      /<Callout\b([^>]*)>([\s\S]*?)<\/Callout>/g,
      (_, attrs: string, inner: string) => {
        const type = jsxAttr(attrs, "type") ?? "note";
        const label =
          jsxAttr(attrs, "title") ??
          CALLOUT_LABELS[type] ??
          CALLOUT_LABELS.note;
        return blockquote(label, inner);
      }
    )
    .replace(
      /<FromTheBuild\b([^>]*)>([\s\S]*?)<\/FromTheBuild>/g,
      (_, attrs: string, inner: string) => {
        const project = jsxAttr(attrs, "project");
        const link = project
          ? [
              "",
              `[See the project](${new URL(projectUrl({ id: project }), SITE.url).href})`,
            ]
          : [];
        return blockquote("From the build", inner, link);
      }
    )
    .replace(/<YouTube\b([\s\S]*?)\/>/g, (_, attrs: string) => {
      const id = jsxAttr(attrs, "id") ?? "";
      const title = jsxAttr(attrs, "title") ?? "YouTube video";
      const channel = jsxAttr(attrs, "channel");
      const label = channel ? `${title} (${channel})` : title;
      return `[Video: ${linkText(label)}](https://www.youtube.com/watch?v=${encodeURIComponent(id)})`;
    })
    .replace(/\n{3,}/g, "\n\n");
}

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
    mdxToMarkdown(post.body ?? "").trim(),
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
