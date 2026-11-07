// Fails the build when a daily news take breaks the house standard (see
// docs/news-brief.md): from STANDARD_FROM on, every published news take needs
// 2 or 3 photos, each with alt text, a title and a credit line under it that
// links the author and the license, plus at least one embedded X or Threads post.
// Runs on the MDX sources, before `astro build`.
/* eslint-disable no-console -- a build check; its output is the build log. */
import { readdirSync, readFileSync } from "node:fs";

const DIR = "src/content/blog";
// The day the daily news take started to require photos and an X or Threads embed.
const STANDARD_FROM = "2026-11-08";

const field = (front, name) =>
  front.match(new RegExp(`^${name}:\\s*['"]?([^'"\\n]*)`, "m"))?.[1].trim();

// A credit line: an italic caption that links the photo's page and its license.
const LICENSE = /creativecommons\.org\/(licenses|publicdomain)\/|public domain|Unsplash License|Pexels License/i;
const credited = line =>
  /^\*.*\*$/.test(line) && /\[[^\]]+\]\(https:\/\/[^\s)]+ "[^"]+"\)/.test(line) && LICENSE.test(line);

const problems = [];
let checked = 0;
for (const name of readdirSync(DIR).filter(f => f.endsWith(".mdx"))) {
  const text = readFileSync(`${DIR}/${name}`, "utf8");
  const [, front = "", body = ""] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const published = field(front, "published") ?? "";
  if (field(front, "frame") !== "news-take" || field(front, "draft") === "true") continue;
  if (published < STANDARD_FROM) continue;
  checked++;

  const lines = body.split("\n");
  const images = lines.map((line, i) => [line.trim(), i]).filter(([line]) => line.startsWith("!["));
  if (images.length < 2 || images.length > 3) {
    problems.push(`${name}: has ${images.length} photos; a news take needs 2 or 3`);
  }
  for (const [line, i] of images) {
    const m = line.match(/^!\[([^\]]*)\]\(([^\s)]+)(?: "([^"]*)")?\)$/);
    if (!m?.[1].trim() || !m[3]?.trim()) {
      problems.push(`${name}: ${m?.[2] ?? line} needs both alt text and a title`);
    }
    const next = lines.slice(i + 1).find(l => l.trim())?.trim() ?? "";
    if (!credited(next)) {
      problems.push(`${name}: ${m?.[2] ?? line} has no credit line (author and license links) right under it`);
    }
  }
  if (!/<SocialPost\b[^>]*platform="(x|threads)"/.test(body)) {
    problems.push(`${name}: has no embedded X or Threads post (<SocialPost platform="x" … /> or "threads")`);
  }
}

if (problems.length) {
  console.error(`News takes that miss the photo and embed standard (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Post check: ${checked} news takes since ${STANDARD_FROM} have 2 or 3 credited photos and an X or Threads embed.`);
