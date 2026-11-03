// Finds and adds freely licensed photos from Wikimedia Commons to a post, with
// the credit line the site uses under every photo.
//
//   node scripts/news-photo.mjs search "Apple Park"
//     Lists photos on Commons for the query that the site may use (public
//     domain, CC0, CC BY or CC BY-SA, at least 1000px wide), with author and
//     license.
//
//   node scripts/news-photo.mjs add <post-slug> <n> "File:Name.jpg" --alt "…" --caption "…"
//     Checks the file's license again, saves it as
//     src/assets/images/content/<post-slug>-<n>.jpg (1280px wide at most) and
//     prints the Markdown to paste into the post: the image with alt text and a
//     title, then an italic caption that credits the author and links the license.
//
// Look at the saved file before using it, and write the alt text from what it shows.
/* eslint-disable no-console -- a command-line helper; its output is the result. */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "urielpapa.com-news-images/1.0 (https://urielpapa.com)";
const OUT = "src/assets/images/content";

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

/** The license line for a Commons file, or null when the site may not use it. */
function license(meta) {
  const short = strip(meta.LicenseShortName?.value);
  const url = strip(meta.LicenseUrl?.value).replace(/^http:/, "https:");
  if (/\b(NC|ND)\b|non-?commercial|no-?deriv|fair use/i.test(short)) return null;
  if (/^CC0/i.test(short)) {
    return {
      label: "CC0",
      url: "https://creativecommons.org/publicdomain/zero/1.0/",
      name: "Creative Commons CC0 1.0 public domain dedication",
    };
  }
  if (/^(public domain|PD\b|PDM)/i.test(short)) return { label: "public domain" };
  const m = short.match(/^CC BY(-SA)? (\d\.\d)(?: ([a-z]{2}))?/i);
  if (!m || !url) return null;
  const sa = Boolean(m[1]);
  const port = m[3] ? ` ${m[3].toUpperCase()}` : "";
  return {
    label: `CC BY${sa ? "-SA" : ""} ${m[2]}${m[3] ? ` ${m[3]}` : ""}`,
    url: url.endsWith("/") ? url : `${url}/`,
    name: `Creative Commons Attribution${sa ? "-ShareAlike" : ""} ${m[2]}${port} license`,
  };
}

async function query(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ action: "query", format: "json", ...params })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons API answered ${res.status}`);
  return Object.values((await res.json()).query?.pages ?? {});
}

const info = { prop: "imageinfo", iiprop: "url|size|mime|extmetadata" };

// Commons serves resized copies at standard widths from upload.wikimedia.org.
function downloadUrl(original, width) {
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
    console.error(`Commons asked to slow down; trying again in ${wait}s`);
    await new Promise(resolve => setTimeout(resolve, wait * 1000));
  }
  throw new Error(`Commons kept refusing ${url}; try again later`);
}

function describe(page) {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  const meta = ii.extmetadata ?? {};
  return {
    file: page.title,
    page: ii.descriptionurl,
    width: ii.width,
    height: ii.height,
    mime: ii.mime,
    original: ii.url,
    author: strip(meta.Artist?.value) || strip(meta.Credit?.value),
    license: license(meta),
    licenseText: strip(meta.LicenseShortName?.value),
    description: strip(meta.ImageDescription?.value).slice(0, 160),
  };
}

async function search(q) {
  const pages = await query({
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${q} filetype:bitmap`,
    gsrlimit: "30",
    ...info,
  });
  const found = pages
    .sort((a, b) => a.index - b.index)
    .map(describe)
    .filter(p => p && p.license && p.author && p.width >= 1000 && /jpeg|png/.test(p.mime));
  if (!found.length) console.log(`No usable photos for "${q}". Try other words.`);
  for (const p of found.slice(0, 12)) {
    console.log(`${p.file}\n  ${p.width}x${p.height} · ${p.license.label} · by ${p.author}\n  ${p.page}`);
    if (p.description) console.log(`  ${p.description}`);
  }
}

async function add(slug, n, file, alt, caption) {
  if (!slug || !/^\d$/.test(n ?? "") || !file || !alt || !caption) {
    throw new Error('Usage: add <post-slug> <n> "File:Name.jpg" --alt "…" --caption "…"');
  }
  const title = file.startsWith("File:") ? file : `File:${file}`;
  const [page] = await query({ titles: title, ...info });
  const p = page && describe(page);
  if (!p) throw new Error(`${title} is not on Wikimedia Commons`);
  if (!p.license) throw new Error(`${title} is ${p.licenseText || "unlicensed"}; the site may not use it`);
  if (!p.author) throw new Error(`${title} has no author to credit; pick another photo`);
  const image = await download(downloadUrl(p.original, p.width));
  mkdirSync(OUT, { recursive: true });
  const out = `${OUT}/${slug}-${n}.jpg`;
  await sharp(image)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);

  const author = safe(p.author);
  const credit = `[${author}](${p.page} "${author}'s photo on Wikimedia Commons")`;
  const lic = p.license.url ? `[${p.license.label}](${p.license.url} "${p.license.name}")` : p.license.label;
  const text = safe(alt);
  const lead = safe(caption).replace(/\.?$/, ".");
  console.log(`Saved ${out}. Look at it before using it.\n`);
  console.log(`![${text}](../../assets/images/content/${slug}-${n}.jpg "${text}")\n`);
  console.log(`*${lead} Photo: ${credit}, ${lic}.*`);
}

const [cmd, ...rest] = process.argv.slice(2);
const flag = name => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
try {
  if (cmd === "search") await search(rest.join(" "));
  else if (cmd === "add") await add(rest[0], rest[1], rest[2], flag("alt"), flag("caption"));
  else throw new Error('Usage: search "<words>" | add <post-slug> <n> "File:Name.jpg" --alt "…" --caption "…"');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
