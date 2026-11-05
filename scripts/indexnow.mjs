// Tells IndexNow search engines (Bing, Yandex, Naver, Seznam, Yep) which URLs changed.
// Run after a production deploy: node scripts/indexnow.mjs <from-sha> <to-sha>
// Set DRY_RUN=1 to print the URLs without submitting them.
/* eslint-disable no-console -- a CLI script; its output is the GitHub Actions log. */
// Content changes submit the changed entries plus the list pages, including
// URLs that went away (post deleted, turned back into a draft, or moved by a
// `frame` change) so engines recrawl them and drop them from the index. A
// changed static page (src/pages/about.astro) submits its own URL.
// Site-wide changes (layouts, styles, config) submit nothing: re-sending every
// unchanged URL on each deploy made Bing treat the submissions as noise and
// crawl less. Engines recrawl those pages on their own. Pass --all (or ALL=1)
// to submit the whole sitemap on purpose, e.g. after a redesign.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { entryFor } from "./content-urls.mjs";

const SITE = "https://urielpapa.com";
const HOST = new URL(SITE).host;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const LIST_PAGES = ["/", "/blog", "/news", "/events", "/notes", "/projects", "/topics"];

const keyFile = readdirSync(new URL("../public", import.meta.url)).find(f =>
  /^[a-f0-9]{32}\.txt$/.test(f),
);
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex>.txt) found.");
const key = keyFile.replace(/\.txt$/, "");

const [from, to = "HEAD"] = process.argv.slice(2).filter(a => !a.startsWith("--"));
// --no-renames: a moved or renamed post shows up as a delete plus an add,
// so its old URL is submitted too.
// Files that never change a public page: notes, the publish log, CI, and the
// private dashboard with its search snapshot. Commits that touch only these
// (a skipped daily run's log line, a dashboard refresh) submit nothing.
const NO_PUBLIC_PAGE = [
  /^docs\//,
  /^\.github\//,
  /^[^/]+\.md$/,
  /^src\/data\/search-console\.json$/,
  /^src\/pages\/dashboard(\.astro|\/)/,
  /^src\/lib\/(dashboard|dashboard-auth|search-refresh)\.ts$/,
];
const changed = from
  ? execFileSync("git", ["diff", "--name-only", "--no-renames", from, to], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .filter(f => !NO_PUBLIC_PAGE.some(re => re.test(f)))
  : [];

/** A file's text at a git revision, or undefined if it did not exist there. */
function textAt(rev, file) {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

/**
 * Public paths a changed content file affects: its current URL if it is live,
 * plus its previous URL if that was live and is now gone (deleted, drafted or moved).
 */
function affectedPaths(file) {
  const entryAt = rev => {
    const text = textAt(rev, file);
    return text === undefined ? undefined : entryFor(file, text);
  };
  const before = entryAt(from);
  const after = entryAt(to);
  const paths = [];
  if (after && !after.draft) paths.push(after.path);
  if (before && !before.draft && (!after || after.draft || after.path !== before.path))
    paths.push(before.path);
  return paths;
}

async function sitemapUrls() {
  const index = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const urls = [];
  for (const map of maps) {
    const xml = await (await fetch(map)).text();
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
  }
  return urls;
}

/** The URL of a static page file (no [param] in its path), or undefined. */
function staticPagePath(file) {
  const m = /^src\/pages\/(.+)\.(astro|md|mdx)$/.exec(file);
  if (!m || m[1].includes("[")) return undefined;
  const route = m[1].replace(/(^|\/)index$/, "");
  return "/" + route;
}

const all = process.argv.includes("--all") || process.env.ALL === "1";
let urls;
if (all) {
  urls = await sitemapUrls();
} else {
  const content = changed.filter(f => f.startsWith("src/content/"));
  const pages = changed.map(staticPagePath).filter(Boolean);
  // A static page outside the sitemap (the dashboard, 404) is never sent;
  // removed content URLs are, so engines drop them.
  const bare = u => u.replace(/\/$/, "");
  const live = pages.length ? new Set((await sitemapUrls()).map(bare)) : new Set();
  const inSitemap = p => live.has(bare(SITE + p));
  urls = [...new Set([...content.flatMap(affectedPaths), ...(content.length ? LIST_PAGES : []), ...pages.filter(inSitemap)])].map(p =>
    p === "/" ? SITE : SITE + p,
  );
  const skipped = changed.length - content.length - pages.length;
  if (skipped)
    console.log(
      `${skipped} site-wide file(s) changed (layouts, styles, config); not re-sending unchanged URLs.`,
    );
}
if (urls.length === 0) {
  console.log("No changed public pages; nothing to submit.");
  process.exit(0);
}

if (process.env.DRY_RUN) {
  console.log(`IndexNow dry run: would submit ${urls.length} URL(s)`);
  for (const u of urls) console.log(`  ${u}`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `${SITE}/${key}.txt`,
    urlList: urls.slice(0, 10000),
  }),
});
console.log(`IndexNow: submitted ${urls.length} URL(s), HTTP ${res.status}`);
for (const u of urls) console.log(`  ${u}`);
// 200 and 202 both mean accepted; anything else is worth a look but shouldn't fail the deploy.
if (![200, 202].includes(res.status)) console.log(await res.text());
