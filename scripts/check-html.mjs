// Fails the build when any image on any page is missing alt text or a title,
// any link is missing a title, has one that only repeats its text or URL, or
// points to a page on this site that does not exist, or a page has no valid
// Schema.org JSON-LD with its own page node. The RSS feed's item bodies get
// the same link check. Runs after `astro build` on the built pages.
/* eslint-disable no-console -- a build check; its output is the build log. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STATIC_DIR } from "./lib/output.mjs";
import { linkProblems } from "../src/utils/linkTitles.mjs";
import { isPrivate } from "../src/lib/routes.mjs";

const ROOT = STATIC_DIR;

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


/** True when an internal href resolves to a built file. */
const resolves = href => {
  const path = decodeURI(href.split(/[?#]/)[0]).replace(/\/$/, "") || "/";
  // Private routes only exist on the server (prerender = false, and Keystatic).
  if (isPrivate(path)) return true;
  return [path, `${path}.html`, join(path, "index.html")].some(p => existsSync(join(ROOT, p)));
};

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
  for (const { href, problem } of linkProblems(html)) {
    problems.push(`${name}: link to ${href} ${problem}`);
  }
  for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
    links++;
    const href = attr(tag, "href");
    if (href?.startsWith("/") && !href.startsWith("//") && !resolves(href)) {
      problems.push(`${file.slice(ROOT.length)}: link to ${href} goes to a page that does not exist`);
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

// The RSS feed: feed readers show post bodies without the site's pages around
// them, so their links need the same titles.
const feed = join(ROOT, "rss.xml");
if (existsSync(feed)) {
  const decode = text =>
    text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const bodies = [...readFileSync(feed, "utf8").matchAll(/<content:encoded>([\s\S]*?)<\/content:encoded>/g)].map(([, b]) =>
    b.startsWith("<![CDATA[") ? b.slice(9, -3) : decode(b),
  );
  for (const body of bodies) {
    links += body.match(/<a\b/g)?.length ?? 0;
    for (const { href, problem } of linkProblems(body)) {
      problems.push(`/rss.xml: link to ${href} ${problem}`);
    }
  }
  if (!bodies.length) problems.push("/rss.xml: has no item bodies to check");
} else {
  problems.push("/rss.xml: was not built");
}

if (problems.length) {
  console.error(`Pages that fail the HTML check (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `HTML check: all ${count} images have alt text and a title, all ${links} links have a descriptive title (RSS feed included) and every internal link resolves, and all ${pages} pages have Schema.org data.`,
);
