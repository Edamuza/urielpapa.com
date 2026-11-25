import { readFile } from "node:fs/promises";
import path from "node:path";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "./getFontPathByWeight";
import { renderOgCard, type OgCardArt } from "./ogCard";
import { SITE } from "@/config";

/*
 * OG images are prerendered at build time from the project root, so images are
 * read straight from disk.
 */
const root = process.cwd();
const CONTENT_IMAGES = path.join(root, "src/assets/images/content");

/** Transparent cut-out of the hero portrait. Used on the home card only. */
const PORTRAIT = path.join(root, "public/images/uriel-papa-portrait-800.webp");

/** A photo on the right half of the card, with its credit line. */
export type OgPhoto = {
  /** Absolute path on disk. */
  file: string;
  /** "Photo: Name · CC BY 4.0"; left out for Uriel's own screenshots. */
  credit?: string;
  position?: "left" | "centre" | "right" | "attention";
};

/**
 * Photo for pages without a card of their own: a laptop with code, CC0 from
 * Wikimedia Commons (already used in the n8n templates post).
 * https://commons.wikimedia.org/wiki/File:Two_Loves_(Unsplash).jpg
 */
export const SITE_PHOTO: OgPhoto = {
  file: path.join(CONTENT_IMAGES, "free-n8n-workflow-templates-github-2.jpg"),
  credit: "Photo: Ehud Neuhaus · CC0",
  position: "left",
};

let fonts: Promise<{ display: ArrayBuffer; body: ArrayBuffer }> | null = null;

function loadFonts(url: URL) {
  fonts ??= (async () => {
    const display = getFontPathByWeight(fontData["--ff-display"], 700, {
      format: "woff",
    });
    const body = getFontPathByWeight(fontData["--ff-body"], 500, {
      format: "woff",
    });
    if (!display || !body) throw new Error("OG image fonts not found");
    const [displayData, bodyData] = await Promise.all(
      [display, body].map(p =>
        fetch(experimental_getFontFileURL(p, url)).then(r => r.arrayBuffer())
      )
    );
    return { display: displayData, body: bodyData };
  })();
  return fonts;
}

const IMAGE_MD =
  /!\[[^\]]*\]\((?:\.\.\/)+assets\/images\/content\/([^\s)]+)[^)]*\)\s*\n\s*\n?\s*(\*[^\n]*\*)/g;
const CREDIT =
  /(Photo|Image|Illustration|Diagram)s?: \[([^\]]+)\]\([^)]*\)[^*]*?(?:\[([^\]]+)\]\([^)]*\)|(public domain))\.\*\s*$/;

/**
 * The freely licensed photo for a post's card: the first image in the post
 * whose caption credits a third-party author and licence (so never Uriel's own
 * photos or screenshots), preferring one without ShareAlike. Undefined when the
 * post has none.
 */
export function postPhoto(body: string | undefined): OgPhoto | undefined {
  const found: { photo: OgPhoto; sa: boolean }[] = [];
  for (const m of (body ?? "").matchAll(IMAGE_MD)) {
    const c = m[2].match(CREDIT);
    if (!c) continue;
    const license = c[3] ?? c[4];
    const kind = c[1] === "Diagram" ? "Image" : c[1];
    found.push({
      photo: {
        file: path.join(CONTENT_IMAGES, m[1]),
        credit: `${kind}: ${c[2]} · ${license}`,
      },
      sa: /SA/.test(license),
    });
  }
  return (found.find(f => !f.sa) ?? found[0])?.photo;
}

/** A project's cover screenshot, read from its frontmatter. */
export async function projectPhoto(
  filePath: string | undefined
): Promise<OgPhoto | undefined> {
  if (!filePath) return undefined;
  const abs = path.join(root, filePath);
  const src = await readFile(abs, "utf8");
  const cover = src.match(/^cover:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
  return cover ? { file: path.resolve(path.dirname(abs), cover) } : undefined;
}

/**
 * 1200×630 social card in the home hero's style: black, title on the left.
 * The home card ("portrait") has Uriel's portrait on the right; every other
 * card has a freely licensed photo there instead.
 */
export async function renderOgImage(opts: {
  title: string;
  /** Hand-set line breaks for the title. */
  lines?: string[];
  label?: string;
  url: URL;
  art: "portrait" | OgPhoto;
}) {
  let art: OgCardArt;
  if (opts.art === "portrait") {
    art = { kind: "portrait", image: await readFile(PORTRAIT) };
  } else {
    art = {
      kind: "photo",
      image: await readFile(opts.art.file),
      credit: opts.art.credit,
      position: opts.art.position,
    };
  }
  const png = await renderOgCard({
    title: opts.title,
    lines: opts.lines,
    label: opts.label,
    name: SITE.name,
    role: `${SITE.jobTitle} · ${SITE.location}`,
    host: new URL(SITE.url).hostname,
    art,
    fonts: await loadFonts(opts.url),
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
