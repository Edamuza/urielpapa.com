/**
 * Generates the favicons, app icons and web manifest in public/ from the "UP"
 * monogram below. Run after changing the design: `node scripts/generate-icons.mjs`
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const LIGHT = { bg: "#ffffff", fg: "#0a0a0a" }; // site background and text tokens
const DARK = { bg: "#0a0a0a", fg: "#ffffff" };

/** The letters, drawn as strokes on a 512 grid so they need no font. */
const letters = `<g fill="none" stroke-width="48" transform="translate(-6 0)">
    <path d="M128 140V300a48 48 0 0 0 96 0V140"/>
    <path d="M304 140V372"/>
    <path d="M304 164H340a56 56 0 0 1 0 112H304"/>
  </g>`;

/** rx: corner radius (0 for full-bleed icons the OS will mask itself). */
const icon = ({ bg, fg }, rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rx}" fill="${bg}"/>
  ${letters.replace('fill="none"', `fill="none" stroke="${fg}"`)}
</svg>`;

/** The browser-tab favicon follows the visitor's light or dark setting. */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <style>
    rect { fill: ${LIGHT.bg}; } g { stroke: ${LIGHT.fg}; }
    @media (prefers-color-scheme: dark) {
      rect { fill: ${DARK.bg}; } g { stroke: ${DARK.fg}; }
    }
  </style>
  <rect width="512" height="512" rx="112"/>
  ${letters}
</svg>
`;

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

/** An .ico file is a small directory followed by the embedded PNG images. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(i => i.data)]);
}

const rounded = icon(LIGHT, 112);
const fullBleed = icon(LIGHT, 0);

await writeFile("public/favicon.svg", faviconSvg);
await writeFile(
  "public/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async size => ({ size, data: await png(rounded, size) }))
    )
  )
);
await writeFile("public/apple-touch-icon.png", await png(fullBleed, 180));
await writeFile("public/icon-192.png", await png(rounded, 192));
await writeFile("public/icon-512.png", await png(rounded, 512));
// Maskable: full bleed; the letters already sit inside the 80% safe zone.
await writeFile("public/icon-maskable-512.png", await png(fullBleed, 512));
await writeFile(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "Uriel Papa",
      short_name: "Uriel Papa",
      start_url: "/",
      display: "standalone",
      background_color: LIGHT.bg,
      theme_color: LIGHT.bg,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    null,
    2
  ) + "\n"
);
process.stdout.write("Icons written to public/\n");
