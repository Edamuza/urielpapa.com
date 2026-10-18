// Fails the build when any image on any page is missing alt text or a title,
// any link is missing a title, or a page has no valid Schema.org JSON-LD with
// its own page node. Runs after `astro build` on the built pages.
/* eslint-disable no-console -- a build check; its output is the build log. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".vercel/output/static";

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

const attr = (tag, name) =>
  new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`).exec(tag)?.slice(1).find(v => v !== undefined);

// Links inside scripts and styles are code, not links on the page.
const withoutCode = html => html.replace(/<(script|style|template|textarea)\b[\s\S]*?<\/\1\s*>/gi, "");

const problems = [];
let count = 0;
let links = 0;
let pages = 0;
for (const file of htmlFiles(ROOT)) {
  const raw = readFileSync(file, "utf8");
  const name = file.slice(ROOT.length);
  // Pagefind's own files and redirect stubs are not pages.
  if (!name.startsWith("/pagefind/") && /<html\b/i.test(raw) && !/http-equiv="refresh"/i.test(raw)) {
    pages++;
    const blocks = [...raw.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    try {
      const nodes = blocks.flatMap(([, json]) => JSON.parse(json)["@graph"] ?? []);
      if (!nodes.some(n => String(n["@id"] ?? "").endsWith("#page"))) {
        problems.push(`${name}: Schema.org JSON-LD has no page node`);
      }
    } catch {
      problems.push(`${name}: Schema.org JSON-LD is not valid JSON`);
    }
  }
  const html = withoutCode(raw);
  for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
    links++;
    if (!attr(tag, "title")?.trim()) {
      problems.push(`${file.slice(ROOT.length)}: link to ${attr(tag, "href")} is missing a title`);
    }
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    count++;
    const missing = ["alt", "title"].filter(name => !attr(tag, name)?.trim());
    if (missing.length) {
      problems.push(`${file.slice(ROOT.length)}: ${attr(tag, "src")} is missing ${missing.join(" and ")}`);
    }
  }
}

if (problems.length) {
  console.error(`Pages that fail the HTML check (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `HTML check: all ${count} images have alt text and a title, all ${links} links have a title, and all ${pages} pages have Schema.org data.`,
);
