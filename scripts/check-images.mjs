// Fails the build when any image on any page is missing alt text or a title.
// Runs after `astro build`; every <img> in the built pages must carry both.
/* eslint-disable no-console -- a build check; its output is the build log. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".vercel/output/static";

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

const attr = (tag, name) =>
  new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`).exec(tag)?.slice(1).find(v => v !== undefined);

const problems = [];
let count = 0;
for (const file of htmlFiles(ROOT)) {
  const html = readFileSync(file, "utf8");
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    count++;
    const missing = ["alt", "title"].filter(name => !attr(tag, name)?.trim());
    if (missing.length) {
      problems.push(`${file.slice(ROOT.length)}: ${attr(tag, "src")} is missing ${missing.join(" and ")}`);
    }
  }
}

if (problems.length) {
  console.error(`Images without alt text or a title (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Image check: all ${count} images have alt text and a title.`);
