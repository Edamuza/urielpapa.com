import assert from "node:assert/strict";
import { test } from "node:test";
import { inSitemap, isPrivate, LISTINGS, pageHref, pathFor, publicPages } from "../src/lib/routes.mjs";

test("pathFor gives every collection its URL", () => {
  assert.equal(pathFor("blog", { id: "a" }), "/blog/a");
  assert.equal(pathFor("blog", { id: "a", frame: "news-take" }), "/news/a");
  assert.equal(pathFor("blog", { id: "a", frame: "event-note" }), "/events/a");
  assert.equal(pathFor("hubs", { id: "ai" }), "/topics/ai");
  assert.equal(pathFor("glossary", { id: "rag" }), "/glossary/rag");
  assert.equal(pathFor("stack", { id: "n8n", about: "Notes" }), "/stack/n8n");
  assert.equal(pathFor("stack", { id: "astro" }), "/stack#astro");
  assert.equal(pathFor("pages", { id: "now" }), "/now");
  assert.throws(() => pathFor("nope", { id: "x" }));
});

test("private and noindex routes stay out of the sitemap", () => {
  for (const p of ["/dashboard", "/dashboard/login", "/api/contact", "/keystatic/x", "/preview/blog/a", "/api"])
    assert.equal(isPrivate(p), true, p);
  for (const p of ["/apis", "/dashboards", "/blog/api-guide"]) assert.equal(isPrivate(p), false, p);
  assert.equal(inSitemap("/search"), false);
  assert.equal(inSitemap("/contact/thanks"), false);
  assert.equal(inSitemap("/contact"), true);
  assert.equal(inSitemap("/"), true);
});

test("publicPages lists static pages, entries and later listing pages", () => {
  const pages = publicPages({
    staticPages: ["/", "/about", "/search", "/dashboard/login", "/404"],
    entries: [
      { collection: "blog", id: "a" },
      { collection: "answers", id: "is-n8n-free" },
      { collection: "glossary", id: "rag" },
      { collection: "releases", id: "astro-6" },
      { collection: "stack", id: "n8n", about: "x" },
      { collection: "stack", id: "astro" },
    ],
    listingTotals: { "/blog": 25, "/answers": 13, "/releases": 3 },
  });
  assert.deepEqual(
    [...pages].sort(),
    [
      "/",
      "/about",
      "/answers/is-n8n-free",
      "/answers/page/2",
      "/blog/a",
      "/blog/page/2",
      "/blog/page/3",
      "/glossary/rag",
      "/releases/astro-6",
      "/stack/n8n",
    ],
  );
});

test("every listing is a root path and page 1 is the listing itself", () => {
  for (const { path } of LISTINGS) assert.match(path, /^\/[a-z]*$/);
  assert.equal(pageHref("/news", 1), "/news");
  assert.equal(pageHref("/news", 4), "/news/page/4");
});
