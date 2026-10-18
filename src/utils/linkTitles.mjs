// Gives every <a> in a page a title: its aria-label, else its text, else an
// inner image's alt, else its href. Links that already have a title keep it.
// Used by src/middleware.ts (dev and build); scripts/check-html.mjs enforces it.

const RAW_BLOCK = /(<(script|style|template|textarea)\b[\s\S]*?<\/\2\s*>)/gi;
const LINK = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

const attr = (attrs, name) =>
  new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i")
    .exec(attrs)
    ?.slice(1)
    .find(v => v !== undefined);

const clean = text =>
  text
    .replace(/<[^>]*>/g, " ")
    .replace(/[←↑→↓↗↘]/g, " ") // decorative arrows
    .replace(/\s+/g, " ")
    .trim()
    .replace(/"/g, "&quot;");

/** The title a link should carry, from what it already says. */
export function linkTitle(attrs, inner) {
  const candidates = [
    attr(attrs, "aria-label"),
    clean(inner),
    attr(inner, "alt"),
    attr(attrs, "href"),
  ];
  return candidates.map(v => v && clean(v)).find(Boolean) ?? "";
}

/** Adds a title to every <a> without one, outside scripts and styles. */
export function addLinkTitles(html) {
  return html
    .split(RAW_BLOCK)
    .map((part, i) => {
      // split() with two capture groups yields: text, block, tag name, text, …
      if (i % 3 !== 0) return part;
      return part.replace(LINK, (link, attrs, inner) => {
        if (attr(attrs, "title")?.trim()) return link;
        const title = linkTitle(attrs, inner);
        if (!title) return link;
        const rest = attrs.replace(/\stitle=(?:"[^"]*"|'[^']*')/i, "");
        return `<a${rest} title="${title}">${inner}</a>`;
      });
    })
    .filter((_, i) => i % 3 !== 2)
    .join("");
}
