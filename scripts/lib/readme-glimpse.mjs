// Pulls a short, plain-text glimpse from a README for the repo cards: the
// opening prose, without logos, badges, link rows, tables of contents, lists,
// tables or code. Used by scripts/update-repos.mjs.

const MAX_CHARS = 420; // the whole glimpse
const SHORT_INTRO = 200; // below this, add the first paragraph of the next section

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** Turns one markdown/HTML paragraph into plain text. */
function plain(text) {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ") // HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ") // reference images, such as badges
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1") // reference links
    .replace(/(\*\*|__)(.+?)\1/g, "$2") // bold
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, "$1$2") // italics
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/&[a-z#0-9]+;/gi, e => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a paragraph is only links, URLs or separators, like a nav row. */
function isLinkRow(raw) {
  const rest = raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/!?\[[^\]]*\]\[[^\]]*\]/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/&[a-z#0-9]+;/gi, "")
    .replace(/[\s·|•,*_\-\p{S}\p{Extended_Pictographic}\uFE0F]+/gu, "");
  return rest.length < 15;
}

/** Splits a README into headings and prose paragraphs, dropping the rest. */
function blocks(markdown) {
  const text = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "") // fenced code
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n${"#".repeat(Number(n))} ${t}\n`)
    .replace(/^(#{1,6} .*)$/gm, "\n$1\n"); // headings stand alone

  const out = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    const raw = chunk.trim();
    if (!raw) continue;
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      out.push({ type: heading[1].length === 1 ? "title" : "heading", text: plain(heading[2]) });
      continue;
    }
    // Not prose: lists, tables, quotes, rules, indented code.
    if (/^([-*+]\s|\d+[.)]\s|\||>|(-{3,}|\*{3,}|_{3,})$| {4}|\t)/.test(raw)) continue;
    if (isLinkRow(raw)) continue;
    const t = plain(raw);
    if (t.length < 25 || t.endsWith(":")) continue; // too short, or a lead-in to a list
    if (/^(live (demo|website|site)|demo app\b|demo:|website:|built with\b|click (on )?the (image|video)\b|(check out|see|visit) https?:\/\/\S+ for\b)/i.test(t)) continue;
    if (/^https?:\/\/\S+$/.test(t)) continue;
    out.push({ type: "p", text: t });
  }
  return out;
}

/** Cuts text to a budget at a sentence end, or a word end with an ellipsis. */
function cut(text, budget) {
  if (text.length <= budget) return text;
  const head = text.slice(0, budget);
  const sentence = [...head.matchAll(/[.!?](?=\s|$)/g)].pop();
  if (sentence && sentence.index >= budget * 0.5) return head.slice(0, sentence.index + 1);
  return head.replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "") + "…";
}

/**
 * The glimpse: the prose before the README's first section, plus the first
 * paragraph of the first real section when that intro is short. Returns the
 * paragraphs, or null when the README has no usable prose.
 */
export function readmeGlimpse(markdown) {
  const list = blocks(markdown);
  const firstHeading = list.findIndex(b => b.type === "heading");
  const intro = (firstHeading === -1 ? list : list.slice(0, firstHeading)).filter(b => b.type === "p");
  const paras = intro.map(b => b.text);

  // A short intro borrows the first paragraph of the first real section (not
  // a table of contents). If that section opens with a list or table, stop.
  // With no intro at all, look at the first three sections for one.
  if (paras.join(" ").length < SHORT_INTRO && firstHeading !== -1) {
    const rest = list.slice(firstHeading);
    const sections = rest
      .map((b, i) => (b.type === "heading" && !/contents/i.test(b.text) ? i : -1))
      .filter(i => i >= 0)
      .slice(0, paras.length ? 1 : 3);
    const next = sections.map(i => rest[i + 1]).find(b => b?.type === "p");
    if (next) paras.push(next.text);
  }

  const out = [];
  let left = MAX_CHARS;
  for (const p of paras) {
    if (left < 80) break;
    const t = cut(p, left);
    out.push(t);
    left -= t.length;
    if (t !== p) break;
  }
  return out.length ? out : null;
}
