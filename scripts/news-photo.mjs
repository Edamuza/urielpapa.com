// Finds and adds freely licensed photos to a post, with the credit line the
// site uses under every photo. Three sources, tried in this order:
//
//   1. Wikimedia Commons
//      node scripts/news-photo.mjs search "Apple Park"
//      node scripts/news-photo.mjs add <post-slug> <n> "File:Name.jpg" --alt "…" --caption "…"
//
//   2. Openverse (Creative Commons photos from Flickr, Commons and others),
//      when Commons is down or has nothing that fits
//      node scripts/news-photo.mjs openverse "Apple Park"
//      node scripts/news-photo.mjs add <post-slug> <n> openverse:<id> --alt "…" --caption "…"
//
//   3. The site's own library: photos already on the site, each with its
//      checked credit. Needs no network, so it always works.
//      node scripts/news-photo.mjs library "data center"
//      node scripts/news-photo.mjs reuse <post-slug> <n> <file.jpg> --caption "…" [--alt "…"]
//
// search, openverse and library list photos the site may use (public domain,
// CC0, CC BY or CC BY-SA, at least 1000px wide). add and reuse save the photo
// as src/assets/images/content/<post-slug>-<n>.jpg and print the Markdown to
// paste: the image with alt text and a title, then an italic caption that
// credits the author and links the license.
//
// Look at the saved file before using it, and write the alt text from what it shows.
/* eslint-disable no-console -- a command-line helper; its output is the result. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const OPENVERSE = "https://api.openverse.org/v1/images/";
const UA = "urielpapa.com-news-images/1.0 (https://urielpapa.com)";
const OUT = "src/assets/images/content";
const POSTS = "src/content/blog";

const strip = html =>
  String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// MDX treats { } < > as code, and titles are quoted with ".
const safe = s => s.replace(/[{}<>]/g, "").replace(/"/g, "'").replace(/\[|\]/g, "");

const CC0 = {
  label: "CC0",
  url: "https://creativecommons.org/publicdomain/zero/1.0/",
  name: "Creative Commons CC0 1.0 public domain dedication",
};

function cc(sa, version, port, url) {
  const P = port ? ` ${port.toUpperCase()}` : "";
  const fallback = `https://creativecommons.org/licenses/by${sa ? "-sa" : ""}/${version}/${port ? `${port}/` : ""}`;
  const u = (url || fallback).replace(/^http:/, "https:");
  return {
    label: `CC BY${sa ? "-SA" : ""} ${version}${port ? ` ${port}` : ""}`,
    url: u.endsWith("/") ? u : `${u}/`,
    name: `Creative Commons Attribution${sa ? "-ShareAlike" : ""} ${version}${P} license`,
  };
}

/** The license for a Commons file, or null when the site may not use it. */
function commonsLicense(meta) {
  const short = strip(meta.LicenseShortName?.value);
  const url = strip(meta.LicenseUrl?.value);
  if (/\b(NC|ND)\b|non-?commercial|no-?deriv|fair use/i.test(short)) return null;
  if (/^CC0/i.test(short)) return CC0;
  if (/^(public domain|PD\b|PDM)/i.test(short)) return { label: "public domain" };
  const m = short.match(/^CC BY(-SA)? (\d\.\d)(?: ([a-z]{2}))?/i);
  return m && url ? cc(Boolean(m[1]), m[2], m[3], url) : null;
}

/** The license for an Openverse result, or null when the site may not use it. */
function openverseLicense(r) {
  if (r.license === "cc0") return CC0;
  if (r.license === "pdm") return { label: "public domain" };
  if (r.license !== "by" && r.license !== "by-sa") return null;
  return cc(r.license === "by-sa", r.license_version || "4.0", "", r.license_url);
}

async function getJson(url, what) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`${what} answered ${res.status}`);
    await new Promise(resolve => setTimeout(resolve, 10_000 * (attempt + 1)));
  }
  throw new Error(`${what} kept refusing; try the next source`);
}

async function commons(params) {
  const url = new URL(COMMONS);
  for (const [k, v] of Object.entries({ action: "query", format: "json", ...params })) {
    url.searchParams.set(k, v);
  }
  return Object.values((await getJson(url, "Wikimedia Commons")).query?.pages ?? {});
}

const info = { prop: "imageinfo", iiprop: "url|size|mime|extmetadata" };

// Commons serves resized copies at standard widths from upload.wikimedia.org.
function commonsDownloadUrl(original, width) {
  const m = original.split("?")[0].match(/\/commons\/(\w\/\w\w)\/([^/]+)$/);
  if (!m || width <= 1280) return original.split("?")[0];
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/1280px-${m[2]}`;
}

async function download(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`Download failed (${res.status}) for ${url}`);
    const wait = Number(res.headers.get("retry-after") || 20) + 5;
    console.error(`The image host asked to slow down; trying again in ${wait}s`);
    await new Promise(resolve => setTimeout(resolve, wait * 1000));
  }
  throw new Error(`The image host kept refusing ${url}; try the next source`);
}

function describeCommons(page) {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  const meta = ii.extmetadata ?? {};
  return {
    id: page.title,
    page: ii.descriptionurl,
    site: "Wikimedia Commons",
    width: ii.width,
    height: ii.height,
    ok: /jpeg|png/.test(ii.mime),
    download: commonsDownloadUrl(ii.url, ii.width),
    author: strip(meta.Artist?.value) || strip(meta.Credit?.value),
    license: commonsLicense(meta),
    licenseText: strip(meta.LicenseShortName?.value),
    description: strip(meta.ImageDescription?.value).slice(0, 160),
  };
}

function describeOpenverse(r) {
  const flickr = r.source === "flickr" || /flickr\.com/.test(r.foreign_landing_url ?? "");
  return {
    id: `openverse:${r.id}`,
    page: r.foreign_landing_url,
    site: flickr ? "Flickr" : r.source === "wikimedia" ? "Wikimedia Commons" : r.provider || r.source,
    width: r.width ?? 0,
    height: r.height ?? 0,
    ok: !r.filetype || /^(jpe?g|png)$/i.test(r.filetype),
    download: r.url,
    author: strip(r.creator),
    license: openverseLicense(r),
    licenseText: `${r.license} ${r.license_version ?? ""}`.trim(),
    description: strip(r.title).slice(0, 160),
  };
}

const usable = p => p && p.license && p.author && p.page && p.ok && (p.width === 0 || p.width >= 1000);

function list(found, q) {
  if (!found.length) console.log(`No usable photos for "${q}". Try other words or the next source.`);
  for (const p of found.slice(0, 12)) {
    console.log(`${p.id}\n  ${p.width || "?"}x${p.height || "?"} · ${p.license.label} · by ${p.author} · ${p.site}\n  ${p.page}`);
    if (p.description) console.log(`  ${p.description}`);
  }
}

async function searchCommons(q) {
  const pages = await commons({ generator: "search", gsrnamespace: "6", gsrsearch: `${q} filetype:bitmap`, gsrlimit: "30", ...info });
  list(pages.sort((a, b) => a.index - b.index).map(describeCommons).filter(usable), q);
}

async function searchOpenverse(q) {
  const url = new URL(OPENVERSE);
  for (const [k, v] of Object.entries({ q, license: "by,by-sa,cc0,pdm", page_size: "20", mature: "false" })) {
    url.searchParams.set(k, v);
  }
  list((await getJson(url, "Openverse")).results.map(describeOpenverse).filter(usable), q);
}

async function lookup(id) {
  if (id.startsWith("openverse:")) {
    return describeOpenverse(await getJson(`${OPENVERSE}${id.slice(10)}/`, "Openverse"));
  }
  const title = id.startsWith("File:") ? id : `File:${id}`;
  const [page] = await commons({ titles: title, ...info });
  return page && describeCommons(page);
}

function creditLine(p) {
  const author = safe(p.author);
  // Parentheses in a link's address end it early in Markdown, so encode them.
  const page = p.page.replace(/\(/g, "%28").replace(/\)/g, "%29");
  const credit = `[${author}](${page} "${author}'s photo on ${p.site}")`;
  const lic = p.license.url ? `[${p.license.label}](${p.license.url} "${p.license.name}")` : p.license.label;
  return `Photo: ${credit}, ${lic}.`;
}

function print(slug, n, alt, caption, credit) {
  const text = safe(alt);
  const lead = safe(caption).replace(/\.?$/, ".");
  console.log(`Saved ${OUT}/${slug}-${n}.jpg. Look at it before using it.\n`);
  console.log(`![${text}](../../assets/images/content/${slug}-${n}.jpg "${text}")\n`);
  console.log(`*${lead} ${credit}*`);
}

async function add(slug, n, id, alt, caption) {
  if (!slug || !/^\d$/.test(n ?? "") || !id || !alt || !caption) {
    throw new Error('Usage: add <post-slug> <n> "File:Name.jpg" | openverse:<id> --alt "…" --caption "…"');
  }
  const p = await lookup(id);
  if (!p) throw new Error(`${id} was not found`);
  if (!p.license) throw new Error(`${id} is ${p.licenseText || "unlicensed"}; the site may not use it`);
  if (!p.author) throw new Error(`${id} has no author to credit; pick another photo`);
  const image = await download(p.download);
  mkdirSync(OUT, { recursive: true });
  await sharp(image)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(`${OUT}/${slug}-${n}.jpg`);
  print(slug, n, alt, caption, creditLine(p));
}

/** Every credited photo already on the site: file, alt text, caption and credit. */
function library() {
  const photos = new Map();
  for (const name of readdirSync(POSTS).filter(f => f.endsWith(".mdx"))) {
    const lines = readFileSync(`${POSTS}/${name}`, "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.trim().match(/^!\[([^\]]+)\]\(\.\.\/\.\.\/assets\/images\/content\/([^)\s]+) "[^"]+"\)$/);
      if (!m) return;
      const next = lines.slice(i + 1).find(l => l.trim())?.trim() ?? "";
      const c = next.match(/^\*(.*?)\s*(Photo: .*\.)\*$/);
      if (!c || !/creativecommons\.org|public domain/i.test(c[2])) return;
      if (!photos.has(m[2])) photos.set(m[2], { file: m[2], alt: m[1], caption: c[1], credit: c[2], post: name });
    });
  }
  return [...photos.values()].filter(p => existsSync(`${OUT}/${p.file}`));
}

function searchLibrary(q) {
  const words = q.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const found = library()
    .map(p => {
      const hay = `${p.alt} ${p.caption} ${p.file}`.toLowerCase();
      return { ...p, score: words.filter(w => hay.includes(w)).length };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!found.length) console.log(`No photo on the site matches "${q}". Try broader words (office, server, phone, city).`);
  for (const p of found.slice(0, 12)) {
    console.log(`${p.file}\n  ${p.alt}\n  ${p.credit} (used in ${p.post})`);
  }
}

function reuse(slug, n, file, caption, alt) {
  if (!slug || !/^\d$/.test(n ?? "") || !file || !caption) {
    throw new Error('Usage: reuse <post-slug> <n> <file.jpg> --caption "…" [--alt "…"]');
  }
  const p = library().find(x => x.file === file);
  if (!p) throw new Error(`${file} is not a credited photo on the site; run library "<words>" first`);
  copyFileSync(`${OUT}/${file}`, `${OUT}/${slug}-${n}.jpg`);
  print(slug, n, alt || p.alt, caption, p.credit);
}

const [cmd, ...rest] = process.argv.slice(2);
const flag = name => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const words = () => rest.filter((_, i) => !rest[i].startsWith("--") && !rest[i - 1]?.startsWith("--")).join(" ");
try {
  if (cmd === "search") await searchCommons(words());
  else if (cmd === "openverse") await searchOpenverse(words());
  else if (cmd === "library") searchLibrary(words());
  else if (cmd === "add") await add(rest[0], rest[1], rest[2], flag("alt"), flag("caption"));
  else if (cmd === "reuse") reuse(rest[0], rest[1], rest[2], flag("caption"), flag("alt"));
  else {
    throw new Error(
      'Usage: search "<words>" | openverse "<words>" | library "<words>" | add <slug> <n> <File:… or openverse:id> --alt "…" --caption "…" | reuse <slug> <n> <file.jpg> --caption "…"'
    );
  }
} catch (error) {
  console.error(`${error.message}\nIf this source is down, try the next one: search (Commons), then openverse, then library.`);
  process.exit(1);
}
