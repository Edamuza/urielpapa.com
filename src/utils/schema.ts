/**
 * JSON-LD builders (schema-and-technical.md §2). Schema only confirms what is
 * visible on the page, so every value here also appears in the page HTML.
 */
import { SITE, SOCIALS } from "@/config";

export const PERSON_ID = `${SITE.url}/#person`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export const abs = (path: string) => new URL(path, SITE.url).href;

export const personNode = () => ({
  "@type": "Person",
  "@id": PERSON_ID,
  name: SITE.name,
  url: abs("/about"),
  ...(SITE.photo && { image: abs(SITE.photo) }),
  jobTitle: SITE.jobTitle,
  description:
    "Filipino technical founder who shares knowledge on AI and LLMs, automation, tech stacks, SEO, GEO and AEO, marketing and how technology affects business and society.",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Technological University of the Philippines",
  },
  address: {
    "@type": "PostalAddress",
    addressRegion: "Metro Manila",
    addressCountry: "PH",
  },
  knowsAbout: [
    "Large language models",
    "Tokenization",
    "AI agents",
    "AI automation",
    "n8n",
    "Claude Code",
    "Laravel",
    "Next.js",
    "React",
    "Astro",
    "Search engine optimization",
    "Generative engine optimization",
    "Answer engine optimization",
    "Digital marketing",
  ],
  knowsLanguage: ["en", "fil"],
  email: `mailto:${SITE.email}`,
  sameAs: SOCIALS.map(s => s.url),
});

export const websiteNode = () => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE.url}/`,
  name: SITE.name,
  description: SITE.description,
  inLanguage: SITE.lang,
  publisher: { "@id": PERSON_ID },
});

export type Crumb = { name: string; href: string };

export const breadcrumbNode = (crumbs: Crumb[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: abs(c.href),
  })),
});

export const collectionNode = (opts: {
  path: string;
  name: string;
  description: string;
  items: { name: string; href: string }[];
}) => ({
  "@type": "CollectionPage",
  "@id": `${abs(opts.path)}#page`,
  url: abs(opts.path),
  name: opts.name,
  description: opts.description,
  isPartOf: { "@id": WEBSITE_ID },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: opts.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: abs(item.href),
    })),
  },
});

/**
 * FAQPage for the questions shown at the end of a page. It has its own @id and is
 * part of the page node (Layout.astro links it with `hasPart`), so the URL carries
 * one page entity with the FAQ inside it, not two unrelated pages.
 */
export const faqNode = (
  pageUrl: string,
  items: { q: string; a: string }[]
) => ({
  "@type": "FAQPage",
  "@id": `${pageUrl}#faq`,
  isPartOf: { "@id": `${pageUrl}#page` },
  mainEntity: items.map(f => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

/** The page node every page gets, unless it passes its own (ProfilePage, CollectionPage…). */
export const webPageNode = (opts: {
  url: string;
  name: string;
  description: string;
  extra?: Record<string, unknown>;
}) => ({
  "@type": "WebPage",
  "@id": `${opts.url}#page`,
  url: opts.url,
  name: opts.name,
  description: opts.description,
  ...opts.extra,
});

export const graph = (...nodes: object[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});
