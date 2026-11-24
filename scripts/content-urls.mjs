// Maps content files to their public URLs and last-changed dates, without Astro.
// Used by the sitemap (lastmod) in astro.config.ts and by scripts/indexnow.mjs.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readEntry } from "./lib/content-file.mjs";
import { pathFor } from "../src/lib/routes.mjs";

// fileURLToPath decodes %20 and friends, so checkouts with spaces in the path work.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

// Content folders and their collection names; URLs come from the route catalogue.
const COLLECTIONS = ["blog", "notes", "projects", "hubs", "pages", "answers", "glossary", "releases"].map(
  name => ({ dir: `src/content/${name}`, name }),
);

/**
 * The content entry for one source file (path relative to the repo root, e.g.
 * "src/content/blog/foo.md") given its text: public path, last-changed date
 * (`updated`, else `published`), draft flag and hub. Undefined for files that are not
 * a content entry. Takes the text so callers can pass an older git revision.
 */
export function entryFor(file, text) {
  const name = file.split("/").pop() ?? "";
  const dir = file.slice(0, -name.length - 1);
  const collection = COLLECTIONS.find(c => c.dir === dir);
  if (!collection || !/\.(md|mdx)$/.test(name) || name.startsWith("_")) return undefined;
  const slug = name.replace(/\.(md|mdx)$/, "");
  const { data } = readEntry(text);
  const date = data.updated || data.lastChecked || data.published;
  return {
    file,
    path: pathFor(collection.name, { id: slug, frame: data.frame, about: data.about }),
    lastmod: date && !Number.isNaN(Date.parse(date)) ? new Date(date) : undefined,
    draft: data.draft === "true",
    hub: data.hub || undefined,
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
