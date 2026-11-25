import satori from "satori";
import sharp from "sharp";

/**
 * The 1200×630 social card, drawn from plain inputs so it can be rendered
 * outside Astro too. src/utils/og.ts loads the fonts
 * and portrait and wraps the PNG in a Response.
 *
 * Look: the home page hero on black. Headline on the left, the portrait cut-out
 * on the right with "URIEL PAPA" in outline type behind it, a soft light behind
 * the portrait and a faint dot grid.
 */
export type OgCardFonts = {
  /** Bricolage Grotesque 700 (woff). */
  display: ArrayBuffer;
  /** Albert Sans 500 (woff). */
  body: ArrayBuffer;
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
  /** Transparent PNG or WebP of the portrait. */
  portrait: Buffer;
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

type Node = { type: string; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown
): Node => ({ type, props: { style, children } });

function titleSize(len: number) {
  if (len > 90) return 46;
  if (len > 70) return 52;
  if (len > 50) return 58;
  if (len > 32) return 64;
  if (len > 20) return 72;
  return 84;
}

export async function renderOgCard(input: OgCardInput): Promise<Buffer> {
  const portrait = sharp(input.portrait).resize({ height: PORTRAIT_H });
  const { data: portraitPng, info } = await portrait
    .png()
    .toBuffer({ resolveWithObject: true });
  const portraitLeft = W - PORTRAIT_RIGHT - info.width;
  const portraitCenter = portraitLeft + info.width / 2;

  // Outline name behind the portrait, like the home hero.
  const outline = (text: string, top: number) =>
    el(
      "div",
      {
        position: "absolute",
        top,
        left: portraitCenter - 300,
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
      outline("URIEL", 118),
      outline("PAPA", 270),
      // Text column
      el(
        "div",
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: portraitLeft + 10,
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

  // Background drawn as plain SVG: satori's repeating radial gradients
  // don't render small dots reliably.
  const cx = portraitCenter;
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="14" cy="14" r="1.5" fill="#ffffff" fill-opacity="0.16"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${INK}" stop-opacity="1"/>
      <stop offset="0.42" stop-color="${INK}" stop-opacity="0.9"/>
      <stop offset="0.72" stop-color="${INK}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="${cx}" cy="330" r="380" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${INK}"/>
  <rect width="100%" height="100%" fill="url(#dots)"/>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
</svg>`;

  return sharp(Buffer.from(background))
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: portraitPng, top: H - info.height, left: portraitLeft },
      // A dark fade at the bottom of the portrait so the cut-off sits in shadow
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="140"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
        ),
        top: H - 140,
        left: portraitLeft,
      },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}
