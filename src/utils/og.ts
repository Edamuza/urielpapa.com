import { readFile } from "node:fs/promises";
import path from "node:path";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "./getFontPathByWeight";
import { renderOgCard } from "./ogCard";
import { SITE } from "@/config";

/**
 * Transparent cut-out of the hero portrait. OG images are prerendered at build
 * time from the project root, so the public/ copy is read straight from disk.
 */
const PORTRAIT = path.join(
  process.cwd(),
  "public/images/uriel-papa-portrait-800.webp"
);

let assets: Promise<{
  fonts: { display: ArrayBuffer; body: ArrayBuffer };
  portrait: Buffer;
}> | null = null;

function loadAssets(url: URL) {
  assets ??= (async () => {
    const display = getFontPathByWeight(fontData["--ff-display"], 700, {
      format: "woff",
    });
    const body = getFontPathByWeight(fontData["--ff-body"], 500, {
      format: "woff",
    });
    if (!display || !body) throw new Error("OG image fonts not found");
    const [displayData, bodyData, portrait] = await Promise.all([
      fetch(experimental_getFontFileURL(display, url)).then(r =>
        r.arrayBuffer()
      ),
      fetch(experimental_getFontFileURL(body, url)).then(r => r.arrayBuffer()),
      readFile(PORTRAIT),
    ]);
    return { fonts: { display: displayData, body: bodyData }, portrait };
  })();
  return assets;
}

/**
 * 1200×630 social card in the home hero's style: black, title on the left, the
 * portrait on the right with "URIEL PAPA" in outline type behind it.
 */
export async function renderOgImage(opts: {
  title: string;
  /** Hand-set line breaks for the title. */
  lines?: string[];
  label?: string;
  url: URL;
}) {
  const { fonts, portrait } = await loadAssets(opts.url);
  const png = await renderOgCard({
    title: opts.title,
    lines: opts.lines,
    label: opts.label,
    name: SITE.name,
    role: `${SITE.jobTitle} · ${SITE.location}`,
    host: new URL(SITE.url).hostname,
    portrait,
    fonts,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
