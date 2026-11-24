/**
 * Build-time numbers for the home page stats, counted from the site's own
 * content: pages, days since launch and sources cited. Nothing is fetched
 * from outside, and the numbers refresh on every deploy.
 */
import {
  getAllBlogEntries,
  getAnswers,
  getHubs,
  getNewsletterIssues,
  getNewsTakes,
  getNotes,
  getPosts,
  getProjects,
  getReleases,
  getTerms,
} from "@/utils/content";
import { getCollection } from "astro:content";
import { publicPages } from "@/lib/routes.mjs";

export const LAUNCH_DATE = "2026-10-17";

/** Public pages, listed the way the sitemap lists them (src/lib/routes.mjs). */
export async function listPages(): Promise<Set<string>> {
  // Fixed pages: every .astro file in src/pages without a [param] in its path.
  const staticPages = Object.keys(import.meta.glob("/src/pages/**/*.astro"))
    .filter(file => !file.includes("["))
    .map(
      file =>
        file
          .replace(/^\/src\/pages/, "")
          .replace(/\.astro$/, "")
          .replace(/\/index$/, "") || "/"
    );
  const entries = [
    ...(await getAllBlogEntries()).map(e => ({
      collection: "blog",
      id: e.id,
      frame: e.data.frame,
    })),
    ...(await getNotes()).map(e => ({ collection: "notes", id: e.id })),
    ...(await getProjects()).map(e => ({ collection: "projects", id: e.id })),
    ...(await getHubs()).map(e => ({ collection: "hubs", id: e.id })),
    ...(await getNewsletterIssues()).map(e => ({
      collection: "newsletter",
      id: e.id,
    })),
    ...(await getAnswers()).map(e => ({ collection: "answers", id: e.id })),
    ...(await getTerms()).map(e => ({ collection: "glossary", id: e.id })),
    ...(await getReleases()).map(e => ({ collection: "releases", id: e.id })),
    ...(await getCollection("stack")).map(e => ({
      collection: "stack",
      id: e.id,
      about: e.data.about,
    })),
  ];
  return publicPages({
    staticPages,
    entries,
    listingTotals: {
      "/blog": (await getPosts()).length,
      "/news": (await getNewsTakes()).length,
      "/answers": (await getAnswers()).length,
      "/releases": (await getReleases()).length,
    },
  });
}

/** Public pages, counted at build the way the sitemap lists them. */
export async function countPages(): Promise<number> {
  return (await listPages()).size;
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
