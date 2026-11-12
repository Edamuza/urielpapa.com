type Node = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

/**
 * Rendered width of an image in the reading column (.app-prose, max-w-read:
 * 34rem): 612px from 768px up (18px root), 578px from 612px up (17px root),
 * otherwise the screen less the 17px page gutters. Browsers pick the srcset
 * file from this, so desktop gets a ~640w file instead of a 1280w one.
 */
export const PROSE_IMAGE_SIZES =
  "(min-width: 768px) 612px, (min-width: 612px) 578px, calc(100vw - 34px)";

/**
 * Sizes every Markdown image to the reading column. When a post has no hero
 * and its first image comes before the first section heading, that image is
 * likely on the first screen (and the LCP), so it loads eagerly with a high
 * fetch priority; every other image stays lazy.
 */
export function rehypeImageSizes() {
  return (
    tree: Node,
    file: { data?: { astro?: { frontmatter?: Record<string, unknown> } } }
  ) => {
    const hasHero = Boolean(file.data?.astro?.frontmatter?.hero);
    let seenHeading = false;
    let first = true;
    const walk = (node: Node) => {
      if (node.type !== "element") {
        node.children?.forEach(walk);
        return;
      }
      if (node.tagName === "h2") seenHeading = true;
      if (node.tagName === "img" && node.properties) {
        node.properties.sizes ??= PROSE_IMAGE_SIZES;
        if (first && !hasHero && !seenHeading) {
          node.properties.loading = "eager";
          node.properties.fetchpriority = "high";
        }
        first = false;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
