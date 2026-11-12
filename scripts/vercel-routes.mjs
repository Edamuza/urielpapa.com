// Adds response headers and the www → apex redirect to Vercel's build output.
// Runs after `astro build`; Vercel ignores vercel.json routes for prebuilt output.
import { readFileSync, writeFileSync } from "node:fs";

const file = ".vercel/output/config.json";
const config = JSON.parse(readFileSync(file, "utf-8"));

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://challenges.cloudflare.com https://platform.twitter.com https://cdn.syndication.twimg.com https://www.threads.net https://www.threads.com https://a.plerdy.com https://www.clarity.ms https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com https://pbs.twimg.com https://abs.twimg.com https://*.cdninstagram.com https://websitelaunches.com https://*.google-analytics.com https://*.googletagmanager.com https://*.plerdy.com https://*.clarity.ms https://c.bing.com",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://challenges.cloudflare.com https://*.plerdy.com wss://a.plerdy.com https://*.clarity.ms https://c.bing.com",
  "frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com https://platform.twitter.com https://syndication.twitter.com https://www.threads.net https://www.threads.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
    // The site serves prerendered images from /_astro; Astro's on-demand image
    // endpoint is unused, so it stays closed (no compute to burn, no attack surface).
    src: "^/_image$",
    status: 404,
  },
  {
    // Build stamp the dashboard polls to know when a redeploy is live.
    src: "^/deploy-version\\.json$",
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
    continue: true,
  },
  {
    // Email assets (the animated signature photo). They have to be public so mail
    // clients can load them, but they stay out of search and image search, and
    // nothing on the site links to them.
    src: "^/email/(.*)$",
    headers: {
      "X-Robots-Tag": "noindex, noimageindex, nofollow, noarchive",
      "Cache-Control": "public, max-age=86400",
    },
    continue: true,
  },
  {
    // Admin, API and preview routes are for people and forms, never for search.
    src: "^/(keystatic|api|preview)(/.*)?$",
    headers: { "X-Robots-Tag": "noindex, nofollow" },
    continue: true,
  },
  {
    src: "^/(.*)$",
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "SAMEORIGIN",
      "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    continue: true,
  },
  {
    // Content Security Policy for the public site (Keystatic needs GitHub and inline
    // React, so it is left out). Report-only until it has been checked on a preview.
    src: "^/(?!keystatic)(.*)$",
    headers: { "Content-Security-Policy-Report-Only": CSP },
    continue: true,
  },
];

// A stamp that changes on every build, even a redeploy of the same commit.
writeFileSync(
  ".vercel/output/static/deploy-version.json",
  JSON.stringify({
    build: `${process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}-${Date.now()}`,
  }) + "\n",
);

const marker = JSON.stringify(extra[1].src);
if (!config.routes.some(r => JSON.stringify(r.src) === marker)) {
  config.routes.unshift(...extra);
  writeFileSync(file, JSON.stringify(config, null, "\t"));
}
