import satori from "satori";
import sharp from "sharp";

/**
 * The 1200×630 social card, drawn from plain inputs so it can be rendered
 * outside Astro too. src/utils/og.ts loads the fonts and images and wraps the
 * PNG in a Response.
 *
 * Two looks, both on black with the title on the left and a faint dot grid:
 * - "portrait" (home page only): the hero portrait cut-out on the right with
 *   "URIEL PAPA" in outline type and a soft light behind it.
 * - "photo" (every other page): a freely licensed photo on the right half in
 *   black and white, fading into the black, with its credit in the corner.
 */
export type OgCardFonts = {
  /** Bricolage Grotesque 700 (woff). */
  display: ArrayBuffer;
  /** Albert Sans 500 (woff). */
  body: ArrayBuffer;
};

export type OgCardArt =
  /** Transparent PNG or WebP of the portrait. */
  | { kind: "portrait"; image: Buffer }
  /** Any photo; it is cropped to fill the right half. */
  | {
      kind: "photo";
      image: Buffer;
      credit?: string;
      /** Crop anchor; defaults to the most interesting area. */
      position?: "left" | "centre" | "right" | "attention";
    };

export type OgCardInput = {
  /** Big text. */
  title: string;
  /** Optional hand-set line breaks for the title (the home card uses three). */
  lines?: string[];
  /** Small outlined tag above the title, such as the topic. */
  label?: string;
  /** "Uriel Papa" */
  name: string;
  /** "Builder and Founder · Philippines" */
  role: string;
  /** "urielpapa.com" */
  host: string;
  art: OgCardArt;
  fonts: OgCardFonts;
};

const W = 1200;
const H = 630;
const INK = "#0a0a0a";
const WHITE = "#f5f5f5";
const MUTED = "#a3a3a3";

/** Portrait box, bottom-right. The image is scaled to this height. */
const PORTRAIT_H = 586;
const PORTRAIT_RIGHT = 60;
/** Where the photo panel starts; it runs to the right edge. */
const PHOTO_LEFT = 600;

type Node = { type: string; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown
): Node => ({ type, props: { style, children } });

const svgBuf = (w: number, h: number, body: string) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`
  );

function titleSize(len: number) {
  if (len > 90) return 46;
  if (len > 70) return 50;
  if (len > 50) return 56;
  if (len > 32) return 62;
  if (len > 20) return 70;
  return 80;
}

/** Dark background with a dot grid, optionally with a light behind (cx, 330). */
function background(glowX?: number) {
  return svgBuf(
    W,
    H,
    `<defs>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="14" cy="14" r="1.5" fill="#ffffff" fill-opacity="0.16"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${INK}" stop-opacity="1"/>
      <stop offset="0.42" stop-color="${INK}" stop-opacity="0.9"/>
      <stop offset="0.72" stop-color="${INK}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="${glowX ?? 0}" cy="330" r="380" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${INK}"/>
  <rect width="100%" height="100%" fill="url(#dots)"/>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  ${glowX === undefined ? "" : `<rect width="100%" height="100%" fill="url(#glow)"/>`}`
  );
}

export async function renderOgCard(input: OgCardInput): Promise<Buffer> {
  const { art } = input;
  const layers: sharp.OverlayOptions[] = [];
  const overlays: Node[] = [];
  let base: Buffer;
  let textRight: number;

  if (art.kind === "portrait") {
    const { data: portraitPng, info } = await sharp(art.image)
      .resize({ height: PORTRAIT_H })
      .png()
      .toBuffer({ resolveWithObject: true });
    const left = W - PORTRAIT_RIGHT - info.width;
    const center = left + info.width / 2;
    textRight = left + 10;
    base = background(center);

    // Outline name behind the portrait, like the home hero.
    const outline = (text: string, top: number) =>
      el(
        "div",
        {
          position: "absolute",
          top,
          left: center - 300,
          width: 600,
          display: "flex",
          justifyContent: "center",
          fontFamily: "Display",
          fontSize: 158,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          // Satori skips text whose color is "transparent", so use a fill that
          // is almost invisible and let the stroke draw the letters.
          color: "rgba(10,10,10,0.01)",
          WebkitTextStroke: "2px rgba(245,245,245,0.4)",
        },
        text
      );
    overlays.push(outline("URIEL", 118), outline("PAPA", 270));
    layers.push({ input: portraitPng, top: H - info.height, left });
    // A dark fade at the bottom of the portrait so the cut-off sits in shadow
    layers.push({
      input: svgBuf(
        info.width,
        140,
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>`
      ),
      top: H - 140,
      left,
    });
  } else {
    const pw = W - PHOTO_LEFT;
    const photo = await sharp(art.image)
      .rotate()
      .resize(pw, H, { fit: "cover", position: art.position ?? "attention" })
      .grayscale()
      .linear(1.12, -14)
      .png()
      .toBuffer();
    textRight = PHOTO_LEFT + 70;
    base = background();
    layers.push({ input: photo, top: 0, left: PHOTO_LEFT });
    // Fade the photo into the black on its left edge, and darken the bottom
    // so the credit stays readable.
    layers.push({
      input: svgBuf(
        pw,
        H,
        `<defs>
        <linearGradient id="l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${INK}" stop-opacity="1"/>
          <stop offset="0.12" stop-color="${INK}" stop-opacity="0.9"/>
          <stop offset="0.45" stop-color="${INK}" stop-opacity="0.25"/>
          <stop offset="1" stop-color="${INK}" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.7" stop-color="${INK}" stop-opacity="0"/>
          <stop offset="1" stop-color="${INK}" stop-opacity="0.75"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#l)"/>
      <rect width="100%" height="100%" fill="url(#b)"/>`
      ),
      top: 0,
      left: PHOTO_LEFT,
    });
    if (art.credit) {
      overlays.push(
        el(
          "div",
          {
            position: "absolute",
            right: 28,
            bottom: 22,
            display: "flex",
            fontSize: 16,
            color: "rgba(245,245,245,0.72)",
          },
          art.credit
        )
      );
    }
  }

  // Hand-set lines are already short, so they get a fixed size that fits.
  const size = input.lines ? 66 : titleSize(input.title.length);

  const tree = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      position: "relative",
      color: WHITE,
      fontFamily: "Body",
      overflow: "hidden",
    },
    [
      ...overlays,
      // Text column
      el(
        "div",
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: textRight,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 0 58px 72px",
        },
        [
          // Top: site tag and optional label
          el("div", { display: "flex", alignItems: "center", gap: 16 }, [
            el(
              "div",
              {
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 24,
                letterSpacing: "0.14em",
                color: WHITE,
              },
              [
                el("div", {
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: WHITE,
                }),
                input.host.toUpperCase(),
              ]
            ),
            input.label
              ? el(
                  "div",
                  {
                    display: "flex",
                    border: "2px solid rgba(245,245,245,0.55)",
                    borderRadius: 999,
                    padding: "6px 18px",
                    fontSize: 22,
                    color: WHITE,
                    background: INK,
                  },
                  input.label
                )
              : null,
          ]),
          // Title
          el(
            "div",
            {
              display: "flex",
              fontFamily: "Display",
              fontSize: size,
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              color: WHITE,
              paddingRight: 24,
              flexDirection: "column",
            },
            (input.lines ?? [input.title]).map(line =>
              el("div", { display: "flex" }, line)
            )
          ),
          // Byline: white pill like the site's main button, then the role
          el("div", { display: "flex", alignItems: "center", gap: 20 }, [
            el(
              "div",
              {
                display: "flex",
                alignItems: "center",
                background: WHITE,
                color: INK,
                borderRadius: 14,
                padding: "12px 22px",
                fontSize: 26,
                fontFamily: "Display",
              },
              input.name
            ),
            el(
              "div",
              { display: "flex", fontSize: 24, color: MUTED },
              input.role
            ),
          ]),
        ]
      ),
    ]
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: [
      {
        name: "Display",
        data: input.fonts.display,
        weight: 700,
        style: "normal",
      },
      { name: "Body", data: input.fonts.body, weight: 500, style: "normal" },
    ],
  });
  const text = { input: Buffer.from(svg), top: 0, left: 0 };

  // The portrait goes over the text layer so the outline name sits behind it;
  // a photo goes under it so the credit sits on top.
  return sharp(base)
    .composite(art.kind === "portrait" ? [text, ...layers] : [...layers, text])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
