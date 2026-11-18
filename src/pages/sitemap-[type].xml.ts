import type { APIRoute, GetStaticPaths } from "astro";
import { SITE } from "@/config";
import {
  answerUrl,
  getAnswers,
  getReleases,
  getTerms,
  releaseUrl,
  termUrl,
} from "@/utils/content";

/**
 * One sitemap per short page type (answers, glossary, releases), listed in
 * sitemap-index.xml through `customSitemaps` in astro.config.ts. Submitting
 * them in Search Console shows how many pages of each type are indexed, which
 * the weekly check in docs/content-500.md reads. Drafts are never listed.
 */
export const getStaticPaths = (() =>
  ["answers", "glossary", "releases"].map(type => ({
    params: { type },
  }))) satisfies GetStaticPaths;

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async ({ params }) => {
  const live = <T extends { data: { draft: boolean } }>(list: T[]) =>
    list.filter(e => !e.data.draft);
  let rows: { path: string; lastmod: Date }[];
  if (params.type === "answers") {
    rows = live(await getAnswers()).map(a => ({
      path: answerUrl(a),
      lastmod: a.data.lastChecked,
    }));
  } else if (params.type === "glossary") {
    rows = live(await getTerms()).map(t => ({
      path: termUrl(t),
      lastmod: t.data.lastChecked,
    }));
  } else {
    rows = live(await getReleases()).map(r => ({
      path: releaseUrl(r),
      lastmod: r.data.published,
    }));
  }
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...rows.map(
      r =>
        `<url><loc>${xmlEscape(new URL(r.path, SITE.url).href)}</loc><lastmod>${r.lastmod.toISOString()}</lastmod></url>`
    ),
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
