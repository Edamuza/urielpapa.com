// Reads a content file (Markdown or MDX with YAML frontmatter) without Astro
// or a YAML parser. Every script that needs a post's fields goes through here,
// so they all agree on quoting, lists and Windows (CRLF) line endings.

const unquote = v => {
  if (/^".*"$/.test(v)) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  return v;
};

/**
 * The frontmatter fields and body of a content file.
 *
 * - Top-level `key: value` scalars, unquoted (`"…"` as JSON, `'…'` with `''`).
 * - Folded or literal blocks (`>-`, `|`) and indented continuation lines are
 *   joined into one line.
 * - `- item` lists become arrays; a list of `- url: …` objects becomes the urls.
 * - Nested objects are skipped.
 * - CRLF line endings are read like LF, and the body comes back with LF.
 */
export function readEntry(text) {
  const normal = text.replace(/\r\n?/g, "\n");
  const m = normal.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/);
  if (!m) return { data: {}, body: normal };
  const data = {};
  let key;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z][\w-]*):(?:\s+(.*))?$/);
    if (kv) {
      key = kv[1];
      const v = (kv[2] ?? "").trim();
      data[key] = v === "" || /^[>|][+-]?$/.test(v) ? "" : unquote(v);
      continue;
    }
    if (!key) continue;
    const item = line.match(/^\s*-\s+(?:url:\s*)?(.*)$/);
    if (item) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(unquote(item[1].trim()));
    } else if (/^\s+url:\s*/.test(line) && Array.isArray(data[key])) {
      data[key].push(unquote(line.replace(/^\s+url:\s*/, "").trim()));
    } else if (/^\s+\S/.test(line) && typeof data[key] === "string") {
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }
  return { data, body: m[2] ?? "" };
}

/** One frontmatter field as a string (empty values and lists count as missing). */
export function field(text, key) {
  const v = readEntry(text).data[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}
