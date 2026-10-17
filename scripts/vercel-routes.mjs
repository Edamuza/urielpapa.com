// Adds response headers and the www → apex redirect to Vercel's build output.
// Runs after `astro build`; Vercel ignores vercel.json routes for prebuilt output.
import { readFileSync, writeFileSync } from "node:fs";

const file = ".vercel/output/config.json";
const config = JSON.parse(readFileSync(file, "utf-8"));

const extra = [
  {
    src: "^/(.*)$",
    has: [{ type: "host", value: "www.urielpapa.com" }],
    headers: { Location: "https://urielpapa.com/$1" },
    status: 308,
  },
  {
    // Markdown copies for AI tools never compete with the HTML page.
    src: "^/(blog|news|events)/([^/]+)\\.md$",
    headers: {
      "X-Robots-Tag": "noindex",
      Link: '<https://urielpapa.com/$1/$2>; rel="canonical"',
      "Content-Type": "text/markdown; charset=utf-8",
    },
    continue: true,
  },
  {
    src: "^/(.*)$",
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    continue: true,
  },
];

const marker = JSON.stringify(extra[1].src);
if (!config.routes.some(r => JSON.stringify(r.src) === marker)) {
  config.routes.unshift(...extra);
  writeFileSync(file, JSON.stringify(config, null, "\t"));
}
