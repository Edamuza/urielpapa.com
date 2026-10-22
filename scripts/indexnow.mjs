// Tells IndexNow search engines (Bing, Yandex, Naver, Seznam, Yep) which URLs changed.
// Run after a production deploy: node scripts/indexnow.mjs <from-sha> <to-sha>
// Set DRY_RUN=1 to print the URLs without submitting them.
/* eslint-disable no-console -- a CLI script; its output is the GitHub Actions log. */
// Content-only changes submit the changed entries plus the list pages, including
// URLs that went away (post deleted, turned back into a draft, or moved by a
// `frame` change) so engines recrawl them and drop them from the index;
// any other change (layouts, styles, config) submits every URL in the live sitemap.
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

const [from, to = "HEAD"] = process.argv.slice(2);
// --no-renames: a moved or renamed post shows up as a delete plus an add,
// so its old URL is submitted too.
const changed = from
  ? execFileSync("git", ["diff", "--name-only", "--no-renames", from, to], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
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

let urls;
if (changed.length === 0) {
  console.log("No changed files given; nothing to submit.");
  process.exit(0);
} else if (changed.every(f => f.startsWith("src/content/"))) {
  const paths = changed.flatMap(affectedPaths);
  urls = [...new Set([...paths, ...LIST_PAGES])].map(p => (p === "/" ? SITE : SITE + p));
} else {
  urls = await sitemapUrls();
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
