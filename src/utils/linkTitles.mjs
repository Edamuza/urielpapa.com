// Gives every <a> in a page a descriptive title when it has none: where the
// link goes, not just what it says. Links that already have a title keep it.
// Used by src/middleware.ts (dev and build) and the RSS feed;
// scripts/check-html.mjs enforces the result.

const RAW_BLOCK = /(<(script|style|template|textarea)\b[\s\S]*?<\/\2\s*>)/gi;
const LINK = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

/** An attribute's raw value from a tag's attribute string, or undefined. */
export const attr = (attrs, name) =>
  new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i")
    .exec(attrs)
    ?.slice(1)
    .find(v => v !== undefined);

const ENTITIES = { amp: "&", quot: '"', "#39": "'", lt: "<", gt: ">" };

/** Visible text: tags, decorative arrows and entities out, spaces collapsed. */
export const plain = html =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|quot|#39|lt|gt);/g, (_, e) => ENTITIES[e])
    .replace(/[←↑→↓↗↘]/g, " ") // decorative arrows
    .replace(/\s+/g, " ")
    .trim();

const escape = text => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** Lower case letters and digits only, for "does this just repeat that?" checks. */
export const squash = text =>
  plain(String(text ?? ""))
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[^a-z0-9]+/g, "");

/**
 * True when a title adds nothing a reader needs: empty, just the link's URL
 * or path, or a copy of a one- or two-word label ("Case study", "Newer",
 * "Reddit"). A longer label copied into the title, such as a post's own
 * name, already says where the link goes.
 */
export function isBareTitle(title, text, href) {
  const t = squash(title);
  if (!t) return true;
  const bare = url =>
    String(url ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\/$/, "");
  if (href && bare(href) === bare(plain(title))) return true;
  const words = plain(String(text ?? ""))
    .split(/\s+/)
    .filter(w => /\w/.test(w));
  return squash(text) === t && words.length <= 2;
}

const host = url => url.hostname.replace(/^www\./, "");

/** The last path segment as words: /docs/getting-started → "getting started". */
const lastSegment = url =>
  decodeURIComponent(url.pathname.replace(/\/+$/, "").split("/").pop() ?? "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

/**
 * The title a link should carry. `titleOf(path)` names the page at an
 * internal path (or returns undefined); without it internal links fall back
 * to their text.
 * @param {string} attrs
 * @param {string} inner
 * @param {(path: string) => string | undefined} [titleOf]
 * @returns {string}
 */
export function linkTitle(attrs, inner, titleOf = () => undefined) {
  const label = plain(attr(attrs, "aria-label") ?? "");
  const text = label || plain(inner) || plain(attr(inner, "alt") ?? "");
  const href = attr(attrs, "href")?.trim() ?? "";

  if (href.startsWith("#")) {
    return text ? `Jump to “${text}” on this page` : "Jump to this section";
  }
  if (href.startsWith("mailto:")) {
    const address = href.slice(7).split("?")[0];
    return `Email ${address}`;
  }

  let url;
  try {
    url = new URL(href, "https://urielpapa.com");
  } catch {
    return text || href;
  }
  if (!/^https?:$/.test(url.protocol)) return text || href;

  if (host(url) === "urielpapa.com") {
    const page = titleOf(url.pathname);
    if (page && squash(page) !== squash(text)) return page;
    if (page) return `Read “${page}”`;
    return text ? `${text}, on urielpapa.com` : `Open ${url.pathname}`;
  }

  // Another site: say what and where.
  const site = host(url);
  const urlish = !text || squash(text).includes(squash(site));
  if (!urlish) return `${text}, on ${site}`;
  const what = lastSegment(url);
  return what ? `Open “${what}” on ${site}` : `Open ${site}`;
}

/**
 * Adds a title to every <a> without one, outside scripts and styles.
 * @param {string} html
 * @param {(path: string) => string | undefined} [titleOf]
 * @returns {string}
 */
export function addLinkTitles(html, titleOf) {
  return html
    .split(RAW_BLOCK)
    .map((part, i) => {
      // split() with two capture groups yields: text, block, tag name, text, …
      if (i % 3 !== 0) return part;
      return part.replace(LINK, (link, attrs, inner) => {
        if (attr(attrs, "title")?.trim()) return link;
        const title = linkTitle(attrs, inner, titleOf);
        if (!title) return link;
        const rest = attrs.replace(/\stitle=(?:"[^"]*"|'[^']*')/i, "");
        return `<a${rest} title="${escape(title)}">${inner}</a>`;
      });
    })
    .filter((_, i) => i % 3 !== 2)
    .join("");
}

/**
 * Links in a page whose title is missing or only repeats the link's own text,
 * URL or path. Used by scripts/check-html.mjs and the tests.
 * @param {string} html
 * @returns {{ href: string, problem: string }[]}
 */
export function linkProblems(html) {
  const problems = [];
  const code = new RegExp(RAW_BLOCK.source, "gi");
  for (const [, attrs, inner] of html.replace(code, "").matchAll(LINK)) {
    const href = attr(attrs, "href") ?? "";
    const title = attr(attrs, "title")?.trim();
    const text =
      plain(attr(attrs, "aria-label") ?? "") ||
      plain(inner) ||
      plain(attr(inner, "alt") ?? "");
    if (!title) problems.push({ href, problem: "is missing a title" });
    else if (isBareTitle(title, text, href)) {
      problems.push({
        href,
        problem: `has a title that only repeats its short label or URL ("${plain(title)}")`,
      });
    }
  }
  return problems;
}
