import assert from "node:assert/strict";
import { test } from "node:test";
import { addLinkTitles, isBareTitle, linkTitle } from "../src/utils/linkTitles.mjs";

const pages = new Map([
  ["/projects/vite-seo-erp", "VITE SEO ERP: one login for HR, CRM and accounting"],
  ["/blog/agents", "AI agents vs automation workflows"],
]);
const titleOf = path => pages.get(path);
const title = (href, text) => linkTitle(` href="${href}"`, text, titleOf);

test("an internal link takes the target page's title", () => {
  assert.equal(title("/projects/vite-seo-erp", "ERP"), "VITE SEO ERP: one login for HR, CRM and accounting");
  assert.equal(title("https://urielpapa.com/blog/agents#faq", "this post"), "AI agents vs automation workflows");
});

test("an internal link whose text is already the page title says Read", () => {
  assert.equal(title("/blog/agents", "AI agents vs automation workflows"), "Read “AI agents vs automation workflows”");
});

test("an unknown internal path keeps its text and names the site", () => {
  assert.equal(title("/images/chart.png", "the chart"), "the chart, on urielpapa.com");
});

test("an external link names its text and the site it opens", () => {
  assert.equal(title("https://www.anthropic.com/news/x", "Anthropic's announcement"), "Anthropic's announcement, on anthropic.com");
  assert.equal(title("https://github.com/acme/getting-started", "github.com/acme/getting-started"), "Open “getting started” on github.com");
  assert.equal(title("https://example.com/", "https://example.com"), "Open example.com");
});

test("hash and mailto links", () => {
  assert.equal(title("#faq", "FAQ"), "Jump to “FAQ” on this page");
  assert.equal(title("mailto:work@urielpapa.com?subject=Hi", "email me"), "Email work@urielpapa.com");
});

test("aria-label and image alt count as the link's text", () => {
  assert.equal(linkTitle(' href="https://x.com/u" aria-label="Uriel on X"', "<svg></svg>"), "Uriel on X, on x.com");
  assert.equal(linkTitle(' href="https://x.com/u"', '<img alt="Profile photo">'), "Profile photo, on x.com");
});

test("addLinkTitles keeps author titles, escapes quotes and skips scripts", () => {
  const html =
    '<a href="/blog/agents" title="Mine">x</a><a href="https://a.com/">Say "hi"</a><script>"<a href=/x>y</a>"</script>';
  assert.equal(
    addLinkTitles(html, titleOf),
    '<a href="/blog/agents" title="Mine">x</a><a href="https://a.com/" title="Say &quot;hi&quot;, on a.com">Say "hi"</a><script>"<a href=/x>y</a>"</script>'
  );
});

test("generated titles are never bare", () => {
  for (const [href, text] of [
    ["/projects/vite-seo-erp", "ERP"],
    ["/blog/agents", "AI agents vs automation workflows"],
    ["https://github.com/acme/x", "github.com/acme/x"],
    ["https://a.com/", "A"],
  ]) {
    assert.equal(isBareTitle(title(href, text), text, href), false, href);
  }
  assert.equal(isBareTitle("Case study", "Case study →", "/projects/x"), true);
  assert.equal(isBareTitle("https://a.com/b", "link", "https://a.com/b"), true);
  assert.equal(isBareTitle("How to check if ChatGPT cites your site", "How to check if ChatGPT cites your site", "/blog/x"), false);
});
