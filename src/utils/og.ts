import satori from "satori";
import sharp from "sharp";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "./getFontPathByWeight";
import { SITE } from "@/config";

/** Black and white 1200×630 social card: title, topic label, name and domain. */
export async function renderOgImage(opts: {
  title: string;
  label?: string;
  url: URL;
}) {
  const display = getFontPathByWeight(fontData["--ff-display"], 700, {
    format: "woff",
  });
  const body = getFontPathByWeight(fontData["--ff-body"], 500, {
    format: "woff",
  });
  if (!display || !body) throw new Error("OG image fonts not found");
  const [displayData, bodyData] = await Promise.all(
    [display, body].map(p =>
      fetch(experimental_getFontFileURL(p, opts.url)).then(r => r.arrayBuffer())
    )
  );

  const el = (
    type: string,
    style: Record<string, unknown>,
    children?: unknown
  ) => ({
    type,
    props: { style, children },
  });

  const len = opts.title.length;
  const size = len > 70 ? 56 : len > 45 ? 66 : 78;

  const svg = await satori(
    el(
      "div",
      {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        color: "#0a0a0a",
        padding: "64px 72px",
        border: "16px solid #0a0a0a",
        fontFamily: "Body",
      },
      [
        el(
          "div",
          { display: "flex" },
          opts.label
            ? el(
                "div",
                {
                  display: "flex",
                  border: "3px solid #0a0a0a",
                  borderRadius: 999,
                  padding: "8px 22px",
                  fontSize: 28,
                },
                opts.label
              )
            : el("div", { display: "flex", fontSize: 28 }, " ")
        ),
        el(
          "div",
          {
            display: "flex",
            fontFamily: "Display",
            fontSize: size,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
          },
          opts.title
        ),
        el(
          "div",
          {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 30,
          },
          [
            el("div", { display: "flex", alignItems: "center", gap: 18 }, [
              el(
                "div",
                {
                  display: "flex",
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: "#0a0a0a",
                  color: "#ffffff",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Display",
                  fontSize: 26,
                },
                "UP"
              ),
              el("div", { display: "flex" }, SITE.name),
            ]),
            el("div", { display: "flex" }, new URL(SITE.url).hostname),
          ]
        ),
      ]
    ) as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Display", data: displayData, weight: 700, style: "normal" },
        { name: "Body", data: bodyData, weight: 500, style: "normal" },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
