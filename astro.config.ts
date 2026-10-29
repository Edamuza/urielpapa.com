import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { rehypeImageTitles } from "./src/utils/rehype/imageTitles";
import { contentEntries } from "./scripts/content-urls.mjs";

const SITE_URL = "https://urielpapa.com";

/** Pages kept out of the sitemap (schema-and-technical.md §3, "Routes for machines"). */
const SITEMAP_EXCLUDE = [
  "/search",
  "/contact/thanks",
  "/newsletter/thanks",
  "/keystatic",
  "/preview",
  "/404",
];

/** Last-changed date per content URL, for the sitemap's lastmod. */
const PUBLISHED = contentEntries().filter(e => e.lastmod && !e.draft);
const LASTMOD = new Map(PUBLISHED.map(e => [e.path, e.lastmod as Date]));

/** Newest date among published entries that match, for listing pages. */
function newest(match: (e: (typeof PUBLISHED)[number]) => boolean) {
  const dates = PUBLISHED.filter(match).map(e => (e.lastmod as Date).getTime());
  return dates.length ? new Date(Math.max(...dates)) : undefined;
}

/** Listing pages change when a post in them does, so they take their newest post's date. */
const POSTS = (e: (typeof PUBLISHED)[number]) =>
  /^\/(blog|news|events)\//.test(e.path);
const LISTING_LASTMOD: [RegExp, Date | undefined][] = [
  [/^\/$/, newest(POSTS)],
  [/^\/topics$/, newest(POSTS)],
  [/^\/blog$/, newest(e => e.path.startsWith("/blog/"))],
  [/^\/news(\/page\/\d+)?$/, newest(e => e.path.startsWith("/news/"))],
  [/^\/events$/, newest(e => e.path.startsWith("/events/"))],
  [/^\/notes$/, newest(e => e.path.startsWith("/notes/"))],
  [/^\/projects$/, newest(e => e.path.startsWith("/projects/"))],
];
for (const hub of new Set(PUBLISHED.map(e => e.hub).filter(Boolean))) {
  LISTING_LASTMOD.push([
    new RegExp(`^/topics/${hub}$`),
    newest(e => POSTS(e) && e.hub === hub),
  ]);
}

/** A self-hosted Latin font family from an @fontsource package (woff2 for browsers, woff for OG images). */
function localFont(
  name: string,
  pkg: string,
  cssVariable: string,
  weights: number[],
  fallbacks: string[],
  italic = false
) {
  const styles = italic
    ? (["normal", "italic"] as const)
    : (["normal"] as const);
  const variants = weights.flatMap(weight =>
    styles.map(style => ({
      weight,
      style,
      src: [
        `@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`,
        `@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff`,
      ] as [string, string],
    }))
  );
  return {
    name,
    cssVariable,
    provider: fontProviders.local(),
    fallbacks,
    options: {
      variants: variants as [(typeof variants)[number], ...typeof variants],
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  // Static pages on Vercel's CDN; only /api/*, /keystatic and /preview/* run on demand.
  output: "static",
  // The stylesheet is about 10 KB compressed, so inlining it saves a
  // render-blocking request on every first visit.
  build: { inlineStylesheets: "always" },
  adapter: vercel(),
  integrations: [
    mdx(),
    react(),
    keystatic(),
    sitemap({
      filter: page => {
        const path = new URL(page).pathname.replace(/\/$/, "");
        return !SITEMAP_EXCLUDE.some(p => path === p || path.startsWith(p));
      },
      // lastmod tells search engines which pages changed; only entries with a real date get one.
      serialize: item => {
        const path = new URL(item.url).pathname.replace(/\/$/, "") || "/";
        const lastmod =
          LASTMOD.get(path) ??
          LISTING_LASTMOD.find(([re]) => re.test(path))?.[1];
        return lastmod ? { ...item, lastmod: lastmod.toISOString() } : item;
      },
    }),
  ],
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeCallouts, rehypeImageTitles],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "min-dark" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: true }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the search UI at dev startup. Found mid-session (first visit to
    // /search), it triggers a re-bundle that leaves open tabs with stale chunks.
    optimizeDeps: { include: ["@pagefind/default-ui"] },
  },
  // Self-hosted from @fontsource packages so builds never depend on a font CDN.
  fonts: [
    localFont(
      "Bricolage Grotesque",
      "bricolage-grotesque",
      "--ff-display",
      [600, 700],
      ["system-ui", "sans-serif"]
    ),
    localFont(
      "Albert Sans",
      "albert-sans",
      "--ff-body",
      [400, 500, 600, 700],
      ["system-ui", "sans-serif"],
      true
    ),
    localFont(
      "JetBrains Mono",
      "jetbrains-mono",
      "--ff-mono",
      [400],
      ["ui-monospace", "monospace"]
    ),
  ],
  // Responsive images for <Image> and Markdown/MDX images: srcset and sizes
  // sized to the container, plus Astro's global styles for them.
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },
  env: {
    schema: {
      /** "true" on preview builds to show drafts (src/config.ts SHOW_DRAFTS). */
      PUBLIC_SHOW_DRAFTS: envField.boolean({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_BING_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GA4_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      RESEND_API_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      CONTACT_TO_EMAIL: envField.string({
        access: "secret",
        context: "server",
        default: "work@urielpapa.com",
      }),
      CONTACT_FROM_EMAIL: envField.string({
        access: "secret",
        context: "server",
        default: "urielpapa.com <contact@urielpapa.com>",
      }),
      BUTTONDOWN_API_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      /** Home page stats: a Google service account key (the whole JSON) with read access to GA4 and Search Console. */
      GOOGLE_SERVICE_ACCOUNT_JSON: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      /** Numeric GA4 property ID (not the G- measurement ID). */
      GA4_PROPERTY_ID: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      /** Search Console property, e.g. "sc-domain:urielpapa.com" or "https://urielpapa.com/". */
      GSC_SITE_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
