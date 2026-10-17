// Maps content files to their public URLs and last-changed dates, without Astro.
// Used by the sitemap (lastmod) in astro.config.ts and by scripts/indexnow.mjs.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath decodes %20 and friends, so checkouts with spaces in the path work.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Reads `key: value` lines from a file's YAML frontmatter (top-level scalars only). */
function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  const data = {};
  for (const line of (match?.[1] ?? "").split("\n")) {
    const m = line.match(/^([A-Za-z]+):\s*['"]?([^'"]*)['"]?\s*$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

function blogPath(slug, frame) {
  if (frame === "news-take") return `/news/${slug}`;
  if (frame === "event-note") return `/events/${slug}`;
  return `/blog/${slug}`;
}

const COLLECTIONS = [
  { dir: "src/content/blog", url: (slug, d) => blogPath(slug, d.frame) },
  { dir: "src/content/notes", url: slug => `/notes/${slug}` },
  { dir: "src/content/projects", url: slug => `/projects/${slug}` },
  { dir: "src/content/hubs", url: slug => `/topics/${slug}` },
  { dir: "src/content/pages", url: slug => `/${slug}` },
];

/**
 * Every content entry: its source file (relative to the repo root), public path,
 * last-changed date (`updated`, else `published`) and draft flag.
 */
export function contentEntries() {
  const entries = [];
  for (const { dir, url } of COLLECTIONS) {
    let files = [];
    try {
      files = readdirSync(join(ROOT, dir));
    } catch (err) {
      if (err.code === "ENOENT") continue;
      throw err;
    }
    for (const name of files) {
      if (!/\.(md|mdx)$/.test(name) || name.startsWith("_")) continue;
      const slug = name.replace(/\.(md|mdx)$/, "");
      const file = `${dir}/${name}`;
      const data = frontmatter(join(ROOT, file));
      const date = data.updated || data.published;
      entries.push({
        file,
        path: url(slug, data),
        lastmod: date && !Number.isNaN(Date.parse(date)) ? new Date(date) : undefined,
        draft: data.draft === "true",
      });
    }
  }
  return entries;
}
