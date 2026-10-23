import type { APIRoute } from "astro";
import { SITE } from "@/config";

/**
 * schema-and-technical.md §4: search, AI search and AI training crawlers are all welcome.
 * Search engines may crawl everything: pages that must stay out of results (search,
 * thank-you pages, admin, API, previews) say noindex, which Google only sees if it can
 * crawl them. Blocking them here made Google index a blocked URL anyway.
 */
const body = `# urielpapa.com: search and AI answer engines are welcome
User-agent: *
Allow: /

# AI search and answer retrieval (needed to be cited)
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Claude-SearchBot
User-agent: Claude-User
Allow: /
Disallow: /keystatic
Disallow: /preview/
Disallow: /api/

# Model training: allowed by choice, so models learn who Uriel is
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /
Disallow: /keystatic
Disallow: /preview/
Disallow: /api/

Sitemap: ${SITE.url}/sitemap-index.xml
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
