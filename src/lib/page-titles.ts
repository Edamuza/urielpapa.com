/**
 * The human title of any page on this site, by path: the entry's own title
 * for content pages, a fixed name for the hand-built pages. Used for link
 * titles that should say where a link goes, not just repeat its text.
 */
import { getCollection } from "astro:content";
import { SITE } from "@/config";
import {
  answerUrl,
  noteUrl,
  postUrl,
  projectUrl,
  releaseUrl,
  termUrl,
} from "@/utils/content";

const FIXED: Record<string, string> = {
  "/": `${SITE.name}, home page`,
  "/about": `About ${SITE.name}`,
  "/blog": `Writing by ${SITE.name}`,
  "/news": `News takes by ${SITE.name}`,
  "/notes": `Notes by ${SITE.name}`,
  "/projects": `Projects by ${SITE.name}`,
  "/topics": `Topics ${SITE.name} writes about`,
  "/events": `Events and talks, ${SITE.name}`,
  "/contact": `Contact ${SITE.name}`,
  "/newsletter": `${SITE.name}'s newsletter`,
  "/stack": `${SITE.name}'s tech stack`,
  "/answers": `Answers by ${SITE.name}`,
  "/glossary": `Glossary, ${SITE.name}`,
  "/releases": `Release notes, ${SITE.name}`,
  "/privacy": "Privacy policy, urielpapa.com",
  "/colophon": "Colophon: how urielpapa.com is built",
  "/search": "Search urielpapa.com",
  "/rss.xml": `${SITE.name}'s RSS feed`,
};

let cached: Promise<Map<string, string>> | undefined;

/** Every content page's path and title, drafts included (read once). */
export function pageTitles(): Promise<Map<string, string>> {
  cached ??= (async () => {
    const map = new Map(Object.entries(FIXED));
    for (const p of await getCollection("blog"))
      map.set(postUrl(p), p.data.title);
    for (const n of await getCollection("notes"))
      map.set(noteUrl(n), n.data.title);
    for (const p of await getCollection("projects"))
      map.set(projectUrl(p), p.data.title);
    for (const h of await getCollection("hubs"))
      map.set(`/topics/${h.id}`, h.data.title);
    for (const i of await getCollection("newsletter"))
      map.set(`/newsletter/${i.id}`, i.data.title);
    for (const a of await getCollection("answers"))
      map.set(answerUrl(a), a.data.question);
    for (const t of await getCollection("glossary"))
      map.set(termUrl(t), `${t.data.term}, glossary`);
    for (const r of await getCollection("releases"))
      map.set(releaseUrl(r), r.data.title);
    for (const t of await getCollection("stack"))
      if (t.data.about) map.set(`/stack/${t.id}`, t.data.name);
    for (const p of await getCollection("pages"))
      map.set(`/${p.id}`, p.data.title);
    return map;
  })();
  return cached;
}

/** The page part of an internal href: no query, hash, trailing slash or .html. */
export function pagePath(href: string): string {
  const path = href.split(/[?#]/)[0].replace(/\.html$/, "");
  return path.length > 1 ? path.replace(/\/$/, "") : "/";
}

/**
 * The title of the page at an internal path, or undefined when it is not a
 * known page. Listing pages after the first read "…, page N".
 */
export function titleOf(
  titles: Map<string, string>,
  href: string
): string | undefined {
  const path = pagePath(href);
  const paged = path.match(/^(.*)\/page\/(\d+)$/);
  if (paged) {
    const base = titles.get(paged[1]);
    return base && `${base}, page ${paged[2]}`;
  }
  return titles.get(path);
}
