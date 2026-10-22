/** Posts per listing page on /blog and /news. Page 1 stays at the section's own URL. */
export const PAGE_SIZE = 12;

export const pageCount = (total: number) =>
  Math.max(1, Math.ceil(total / PAGE_SIZE));

export const pageItems = <T>(items: T[], page: number) =>
  items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

/** "/blog" for page 1, "/blog/page/2" after that. */
export const pageHref = (base: string, page: number) =>
  page === 1 ? base : `${base}/page/${page}`;

/** getStaticPaths entries for pages 2..N (page 1 is the section's index.astro). */
export const laterPages = (total: number) =>
  Array.from({ length: pageCount(total) - 1 }, (_, i) => ({
    params: { page: String(i + 2) },
    props: { page: i + 2 },
  }));
