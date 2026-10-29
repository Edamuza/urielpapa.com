/**
 * Build-time numbers for the home page stats, counted from the site's own
 * content: pages, days since launch and sources cited. Nothing is fetched
 * from outside, and the numbers refresh on every deploy.
 */
import {
  getAllBlogEntries,
  getHubs,
  getNewsletterIssues,
  getNewsTakes,
  getNotes,
  getPosts,
  getProjects,
  noteUrl,
  postUrl,
  projectUrl,
} from "@/utils/content";
import { pageCount, pageHref } from "@/utils/pagination";

export const LAUNCH_DATE = "2026-10-17";

/** Routes that never appear in the sitemap (keep in step with SITEMAP_EXCLUDE in astro.config.ts). */
const NOT_IN_SITEMAP = [
  "/404",
  "/search",
  "/contact/thanks",
  "/newsletter/thanks",
];

/** Public pages, counted at build the way the sitemap lists them. */
export async function countPages(): Promise<number> {
  const paths = new Set<string>();
  // Fixed pages: every .astro file in src/pages without a [param] in its path.
  for (const file of Object.keys(import.meta.glob("/src/pages/**/*.astro"))) {
    if (file.includes("[")) continue;
    const path =
      file
        .replace(/^\/src\/pages/, "")
        .replace(/\.astro$/, "")
        .replace(/\/index$/, "") || "/";
    if (!NOT_IN_SITEMAP.includes(path)) paths.add(path);
  }
  for (const p of await getAllBlogEntries()) paths.add(postUrl(p));
  for (const n of await getNotes()) paths.add(noteUrl(n));
  for (const p of await getProjects()) paths.add(projectUrl(p));
  for (const h of await getHubs()) paths.add(`/topics/${h.id}`);
  for (const i of await getNewsletterIssues()) paths.add(`/newsletter/${i.id}`);
  // Listing pages after the first: /blog/page/2, /news/page/2 and so on.
  const listings = [
    ["/blog", (await getPosts()).length],
    ["/news", (await getNewsTakes()).length],
  ] as const;
  for (const [base, total] of listings)
    for (let page = 2; page <= pageCount(total); page++)
      paths.add(pageHref(base, page));
  return paths.size;
}

/** Whole days from launch to today in Manila, where the site is published. */
export function daysSinceLaunch(now = new Date()): number {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  return Math.round((Date.parse(today) - Date.parse(LAUNCH_DATE)) / 86_400_000);
}

const SITE_HOST = /^https?:\/\/(www\.)?urielpapa\.com/i;

/**
 * Distinct outside pages linked from published posts and notes, plus each
 * news take's sourceUrl. Links back to this site do not count.
 */
export async function countSources(): Promise<number> {
  const urls = new Set<string>();
  const add = (url: string) => {
    if (SITE_HOST.test(url)) return;
    urls.add(url.replace(/[#?].*$/, "").replace(/\/$/, ""));
  };
  const entries = [...(await getAllBlogEntries()), ...(await getNotes())];
  for (const e of entries) {
    for (const [, url] of (e.body ?? "").matchAll(/\]\((https?:\/\/[^\s)]+)/g))
      add(url);
    const source = (e.data as { sourceUrl?: string }).sourceUrl;
    if (source) add(source);
  }
  return urls.size;
}
