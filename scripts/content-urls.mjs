// Maps content files to their public URLs and last-changed dates, without Astro.
// Used by the sitemap (lastmod) in astro.config.ts and by scripts/indexnow.mjs.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath decodes %20 and friends, so checkouts with spaces in the path work.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Reads `key: value` lines from a file's YAML frontmatter (top-level scalars only).
 * Tolerates CRLF line endings (files saved on Windows).
 */
function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  for (const line of (match?.[1] ?? "").split(/\r?\n/)) {
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
 * The content entry for one source file (path relative to the repo root, e.g.
 * "src/content/blog/foo.md") given its text: public path, last-changed date
 * (`updated`, else `published`) and draft flag. Undefined for files that are not
 * a content entry. Takes the text so callers can pass an older git revision.
 */
export function entryFor(file, text) {
  const name = file.split("/").pop() ?? "";
  const dir = file.slice(0, -name.length - 1);
  const collection = COLLECTIONS.find(c => c.dir === dir);
  if (!collection || !/\.(md|mdx)$/.test(name) || name.startsWith("_")) return undefined;
  const slug = name.replace(/\.(md|mdx)$/, "");
  const data = frontmatter(text);
  const date = data.updated || data.published;
  return {
    file,
    path: collection.url(slug, data),
    lastmod: date && !Number.isNaN(Date.parse(date)) ? new Date(date) : undefined,
    draft: data.draft === "true",
  };
}

/** Every content entry in the working tree (see `entryFor`). */
export function contentEntries() {
  const entries = [];
  for (const { dir } of COLLECTIONS) {
    let files;
    try {
      files = readdirSync(join(ROOT, dir));
    } catch (err) {
      if (err.code === "ENOENT") continue;
      throw err;
    }
    for (const name of files) {
      if (!/\.(md|mdx)$/.test(name) || name.startsWith("_")) continue;
      const file = `${dir}/${name}`;
      const entry = entryFor(file, readFileSync(join(ROOT, file), "utf8"));
      if (entry) entries.push(entry);
    }
  }
  return entries;
}
