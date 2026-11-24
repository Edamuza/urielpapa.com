// Quality gates for the short page types: answers, glossary terms and release
// notes (docs/content-500.md, "Quality gates"). Fails the build when a page
// would publish without what makes it worth a click. Runs on the sources,
// before `astro build`; check-html.mjs then checks alt and title on the built
// pages. Drafts are reported as warnings so work in progress never blocks a deploy.
/* eslint-disable no-console -- a build check; its output is the build log. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readEntry } from "./lib/content-file.mjs";

const TYPES = {
  answers: { dir: "src/content/answers", words: [250, 700], sources: 2, lead: "answer" },
  glossary: { dir: "src/content/glossary", words: [300, 600], sources: 1, lead: "definition" },
  releases: { dir: "src/content/releases", words: [200, 450], sources: 0, lead: "upgrade" },
};

// Phrases from the AI slop cleanup: filler that says nothing, and the tics
// readers spot as machine-written. Matched case-insensitively as whole phrases.
export const BANNED = [
  "delve",
  "in today's fast-paced",
  "in today's digital",
  "in the ever-evolving",
  "ever-changing landscape",
  "game-changer",
  "game changer",
  "unlock the power",
  "unleash",
  "harness the power",
  "a testament to",
  "it's important to note",
  "it is important to note",
  "it's worth noting",
  "navigate the complexities",
  "in conclusion",
  "in summary",
  "seamlessly",
  "revolutionize",
  "cutting-edge",
  "embark on",
  "dive into",
  "deep dive",
  "look no further",
  "whether you're a",
  "the world of",
  "tapestry",
  "elevate your",
  "supercharge",
  "robust and scalable",
  "plays a crucial role",
  "plays a pivotal role",
];

const words = s =>
  s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|-]/g, " ")
    .split(/\s+/)
    .filter(w => /\w/.test(w)).length;

const norm = s =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(a|an|the|is|are|what|how|do|does|i|my|to|of|in|for|and|or|on|it|can|you|your)\b/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Share of words two titles have in common (Jaccard), 0 to 1. */
const similarity = (a, b) => {
  const A = new Set(norm(a));
  const B = new Set(norm(b));
  if (!A.size || !B.size) return 0;
  const shared = [...A].filter(w => B.has(w)).length;
  return shared / new Set([...A, ...B]).size;
};

const sourceUrls = text =>
  [...text.matchAll(/^\s+url:\s*['"]?(https?:\/\/[^\s'"]+)/gm)].map(m => m[1]);

const errors = [];
const warnings = [];
const report = (draft, msg) => (draft ? warnings : errors).push(msg);
const entries = [];

for (const [type, rule] of Object.entries(TYPES)) {
  if (!existsSync(rule.dir)) continue;
  for (const name of readdirSync(rule.dir).filter(f => /\.mdx?$/.test(f) && !f.startsWith("_"))) {
    const file = `${rule.dir}/${name}`;
    const text = readFileSync(file, "utf8");
    const { data, body } = readEntry(text);
    const draft = data.draft === "true";
    const id = name.replace(/\.mdx?$/, "");
    const title = data.question || data.term || data.title || id;
    entries.push({ type, id, file, title, draft, data });
    const say = msg => report(draft, `${file}: ${msg}`);

    // Gate 2: sources opened, not guessed.
    const urls = sourceUrls(text);
    if (urls.length < rule.sources) say(`has ${urls.length} sources; ${type} need at least ${rule.sources}`);
    if (new Set(urls).size !== urls.length) say("lists the same source twice");

    // Gate 3: something the top results do not have.
    const gain = [
      [/^\|.*\|\s*$/m, "a table"],
      [/```/, "a code example"],
      [/<FromTheBuild\b/, "a From the build box"],
      [/\]\(\/(projects|stack|blog|news|events)\//, "a link to Uriel's own work or posts"],
      [/Philippine|Philippines|\bBIR\b|\bBSP\b|\bDTI\b|GCash|\bMaya\b/, "a Philippine angle"],
      [/^!\[/m, "an image"],
    ].filter(([re]) => re.test(body));
    if (gain.length === 0) {
      say("has nothing beyond a plain explanation: add a first-hand example, a table, tested code, a Philippine angle or a useful image");
    }

    // Gate 4: length within the type's range, no padding.
    const count = words(body) + words(data[rule.lead] ?? "");
    const [min, max] = rule.words;
    if (count < min || count > max) say(`is ${count} words; ${type} should be ${min} to ${max}`);

    // Gate 5: house voice.
    const lower = `${title} ${data[rule.lead] ?? ""} ${body}`.toLowerCase();
    for (const phrase of BANNED) {
      if (new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(lower)) {
        say(`uses "${phrase}"`);
      }
    }
    if (/\b(he|him|his)\b/i.test(body) && /Uriel/.test(body)) {
      say("may refer to Uriel as he/him/his; use the name or they/them");
    }

    // Gate 6: every image has alt text and a title; every link has a title.
    for (const [img, alt, , t] of body.matchAll(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g)) {
      if (!alt.trim() || !t?.trim()) say(`image ${img.slice(0, 60)} needs alt text and a title`);
    }
    const links = [...body.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g)];
    for (const [, text, href, t] of links) {
      if (!t?.trim()) say(`link "${text}" (${href}) needs a descriptive title`);
    }
    // Gate 7: linked out (the page template adds the hub, tool and index links).
    const internal = links.filter(([, , href]) => href.startsWith("/"));
    for (const [, , href] of internal) {
      const post = href.match(/^\/(blog|news|events)\/([^/#?]+)/)?.[2];
      if (!post) continue;
      const src = ["md", "mdx"].map(x => `src/content/blog/${post}.${x}`).find(existsSync);
      if (!src) say(`links to ${href}, which does not exist`);
      else if (/^draft:\s*true/m.test(readFileSync(src, "utf8"))) say(`links to ${href}, which is still a draft`);
    }
    if (internal.length < 1) say("needs at least 1 in-body link to another page on this site");
    if (links.length < 2) say(`has ${links.length} in-body links; needs at least 2`);

    if (type === "releases") {
      // Gate 6 for release notes: at least one real, credited image.
      const credited = body
        .split("\n")
        .some((l, i, all) => l.trim().startsWith("![") && /^\*.*(creativecommons\.org|public domain|official).*\*$/i.test(all.slice(i + 1).find(x => x.trim())?.trim() ?? ""));
      if (!credited) say("needs at least one image with a credit line under it (photo, screenshot or official asset)");
      if (data.tool && !id.startsWith(`${data.tool}-`)) say(`slug should start with the tool id "${data.tool}-"`);
      if (data.version && !title.includes(data.version)) say(`title should name the exact version (${data.version})`);
    }
    if (type === "answers" && data.lastChecked && data.published && data.lastChecked < data.published) {
      say("lastChecked is before published");
    }
  }
}

// Gate 1: one page per question. Exact repeats, glossary names, release versions,
// and near-duplicate titles across answers and existing long posts.
const blogTitles = existsSync("src/content/blog")
  ? readdirSync("src/content/blog")
      .filter(f => /\.mdx?$/.test(f))
      .map(f => ({ file: `src/content/blog/${f}`, title: readEntry(readFileSync(`src/content/blog/${f}`, "utf8")).data.title ?? "" }))
  : [];
const seenTerms = new Map();
const seenVersions = new Map();
for (const e of entries) {
  const say = msg => report(e.draft, `${e.file}: ${msg}`);
  if (e.type === "glossary") {
    const akas = Array.isArray(e.data.aka) ? e.data.aka : [];
    for (const n of [e.title, ...akas].map(s => s.toLowerCase().trim())) {
      if (seenTerms.has(n)) say(`"${n}" is already defined in ${seenTerms.get(n)}`);
      else seenTerms.set(n, e.file);
    }
  }
  if (e.type === "releases") {
    const key = `${e.data.tool}@${e.data.version}`;
    if (seenVersions.has(key)) say(`${key} already has a release note: ${seenVersions.get(key)}`);
    else seenVersions.set(key, e.file);
  }
}
const answers = entries.filter(e => e.type === "answers");
for (const [i, a] of answers.entries()) {
  for (const b of answers.slice(i + 1)) {
    if (similarity(a.title, b.title) >= 0.6) {
      report(a.draft && b.draft, `${b.file}: asks nearly the same question as ${a.file}; add it to that page instead`);
    }
  }
  for (const p of blogTitles) {
    if (similarity(a.title, p.title) >= 0.8) {
      report(a.draft, `${a.file}: nearly repeats the long post ${p.file}; link to it or add the answer there`);
    }
  }
}

// A glossary term must not compete with a long "What is …" post on the same term.
for (const t of entries.filter(e => e.type === "glossary")) {
  const names = [t.title, ...(Array.isArray(t.data.aka) ? t.data.aka : [])].map(n => n.toLowerCase());
  for (const p of blogTitles) {
    const m = p.title.toLowerCase().match(/^what is (?:an? |the )?([^,?:]+)/);
    if (m && names.includes(m[1].trim())) {
      report(t.draft, `${t.file}: ${p.file} already explains "${m[1].trim()}"; link to it instead of a glossary page`);
    }
  }
}

// A release note must not repeat a news take on the same version.
for (const r of entries.filter(e => e.type === "releases")) {
  for (const p of blogTitles) {
    const sameVersion = r.data.version && new RegExp(`\\b${r.data.version.replace(/\./g, "\\.")}\\b`).test(p.title);
    const sameTool = norm(p.title).join(" ").includes(String(r.data.tool ?? "").replace(/-/g, " "));
    if (sameVersion && sameTool) {
      report(r.draft, `${r.file}: ${p.file} already covers this version; update that post instead`);
    }
  }
}

for (const w of warnings) console.warn(`  draft: ${w}`);
if (errors.length) {
  console.error(`Short pages that fail the quality gates (${errors.length}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
const live = entries.filter(e => !e.draft).length;
console.log(
  `Content check: ${live} published short pages pass the quality gates${warnings.length ? ` (${warnings.length} draft warnings)` : ""}.`,
);
