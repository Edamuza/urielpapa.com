// The route catalogue: the one place that knows every public URL on the site.
// Plain JavaScript with no Astro imports, so the pages (src/utils/content.ts,
// src/lib/site-stats.ts), astro.config.ts and the scripts (content-urls.mjs,
// indexnow.mjs, check-html.mjs) all build URLs the same way.
// The two copies that can't import it, deploy/nginx and robots.txt, point here.

export const SITE_URL = "https://urielpapa.com";

/** Posts per listing page; page 1 stays at the section's own URL. */
export const PAGE_SIZE = 12;

/**
 * The public path of a content entry.
 * @param {string} collection  the content collection, e.g. "blog" or "glossary"
 * @param {{ id: string, frame?: string, about?: unknown }} entry
 * @returns {string}
 */
export function pathFor(collection, entry) {
  const { id } = entry;
  switch (collection) {
    case "blog":
      // Posts stay flat under /blog; news takes and event notes get their own sections.
      if (entry.frame === "news-take") return `/news/${id}`;
      if (entry.frame === "event-note") return `/events/${id}`;
      return `/blog/${id}`;
    case "notes":
      return `/notes/${id}`;
    case "projects":
      return `/projects/${id}`;
    case "hubs":
      return `/topics/${id}`;
    case "newsletter":
      return `/newsletter/${id}`;
    case "answers":
      return `/answers/${id}`;
    case "glossary":
      return `/glossary/${id}`;
    case "releases":
      return `/releases/${id}`;
    case "stack":
      // A tool gets its own page only when it has an "about" write-up.
      return entry.about ? `/stack/${id}` : `/stack#${id}`;
    case "pages":
      return `/${id}`;
    default:
      throw new Error(`No route for collection "${collection}"`);
  }
}

/** Collections whose entries are pages of their own (stack only with "about"). */
export const COLLECTIONS = [
  "blog",
  "notes",
  "projects",
  "hubs",
  "newsletter",
  "answers",
  "glossary",
  "releases",
  "stack",
  "pages",
];

/**
 * Listing pages: they change whenever an entry in them does. `paged` names
 * the listings that split into /page/2, /page/3 and so on.
 */
export const LISTINGS = [
  { path: "/" },
  { path: "/blog", paged: true },
  { path: "/news", paged: true },
  { path: "/events" },
  { path: "/notes" },
  { path: "/projects" },
  { path: "/topics" },
  { path: "/answers", paged: true },
  { path: "/glossary" },
  { path: "/releases", paged: true },
  { path: "/stack" },
  { path: "/newsletter" },
];

/**
 * "/blog" for page 1, "/blog/page/2" after that.
 * @param {string} base
 * @param {number} page
 * @returns {string}
 */
export const pageHref = (base, page) =>
  page === 1 ? base : `${base}/page/${page}`;

/**
 * Number of listing pages for a number of items (at least 1).
 * @param {number} total
 * @returns {number}
 */
export const pageCount = total => Math.max(1, Math.ceil(total / PAGE_SIZE));

/** Paths served only on demand and never public: admin, API, previews, dashboard. */
export const PRIVATE = ["/api/", "/dashboard", "/keystatic", "/preview/"];

/** Public routes that stay out of the sitemap (noindex pages). */
export const NOT_IN_SITEMAP = [
  "/404",
  "/search",
  "/contact/thanks",
  "/newsletter/thanks",
];

/** @param {string} path @param {string} prefix */
const under = (path, prefix) =>
  prefix.endsWith("/")
    ? path.startsWith(prefix) || path === prefix.slice(0, -1)
    : path === prefix || path.startsWith(`${prefix}/`);

/**
 * True for the private, on-demand paths (see PRIVATE).
 * @param {string} path
 * @returns {boolean}
 */
export const isPrivate = path => PRIVATE.some(p => under(path, p));

/**
 * True when a path belongs in the sitemap and the page count.
 * @param {string} path
 * @returns {boolean}
 */
export const inSitemap = path =>
  !isPrivate(path) && !NOT_IN_SITEMAP.some(p => under(path, p));

/**
 * Every public page, listed the way the sitemap lists them.
 * @param {{
 *   staticPages: string[],
 *   entries: { collection: string, id: string, frame?: string, about?: unknown }[],
 *   listingTotals: Record<string, number>,
 * }} input
 *   staticPages: paths of the hand-built pages (src/pages files without a [param]);
 *   entries: every published content entry;
 *   listingTotals: items per paged listing, e.g. { "/blog": 40 }.
 * @returns {Set<string>}
 */
export function publicPages({ staticPages, entries, listingTotals }) {
  const paths = new Set(staticPages.filter(inSitemap));
  for (const e of entries) {
    const path = pathFor(e.collection, e);
    if (!path.includes("#")) paths.add(path);
  }
  for (const { path, paged } of LISTINGS) {
    if (!paged) continue;
    for (let page = 2; page <= pageCount(listingTotals[path] ?? 0); page++)
      paths.add(pageHref(path, page));
  }
  return paths;
}
