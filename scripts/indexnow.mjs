// Tells IndexNow search engines (Bing, Yandex, Naver, Seznam, Yep) which URLs changed.
// Run after a production deploy: node scripts/indexnow.mjs <from-sha> <to-sha>
// Set DRY_RUN=1 to print the URLs without submitting them.
/* eslint-disable no-console -- a CLI script; its output is the GitHub Actions log. */
// Content-only changes submit the changed entries plus the list pages;
// any other change (layouts, styles, config) submits every URL in the live sitemap.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { contentEntries } from "./content-urls.mjs";

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
const changed = from
  ? execFileSync("git", ["diff", "--name-only", from, to], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
  : [];

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
  const byFile = new Map(contentEntries().map(e => [e.file, e]));
  const paths = changed
    .map(f => byFile.get(f))
    .filter(e => e && !e.draft)
    .map(e => e.path);
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
