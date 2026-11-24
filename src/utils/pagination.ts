// Page size and listing URLs live in the route catalogue, shared with the scripts.
import { PAGE_SIZE, pageCount, pageHref } from "@/lib/routes.mjs";

export { PAGE_SIZE, pageCount, pageHref };

export const pageItems = <T>(items: T[], page: number) =>
  items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

/** getStaticPaths entries for pages 2..N (page 1 is the section's index.astro). */
export const laterPages = (total: number) =>
  Array.from({ length: pageCount(total) - 1 }, (_, i) => ({
    params: { page: String(i + 2) },
    props: { page: i + 2 },
  }));
