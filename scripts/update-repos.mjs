/* eslint-disable no-console -- a CLI script; its output is the terminal log. */
// Refreshes src/data/repos.json, the saved GitHub details behind the repo cards
// on project pages and in posts, including a short glimpse of each README.
// Reads every project's `repo` field and every <RepoCard repo="…" /> in a blog
// post, and asks the GitHub API.
// Usage: GITHUB_TOKEN=... node scripts/update-repos.mjs (the token is optional,
// but unauthenticated requests are limited to 60 an hour).
import { readFile, readdir, writeFile } from "node:fs/promises";
import { readmeGlimpse } from "./lib/readme-glimpse.mjs";

const DIR = "src/content/projects";
const POSTS = "src/content/blog";
const OUT = "src/data/repos.json";

const files = (await readdir(DIR)).filter(f => /\.mdx?$/.test(f));
const repos = [];
for (const f of files) {
  const text = await readFile(`${DIR}/${f}`, "utf8");
  const m = text.match(/^repo:\s*["']?([\w.-]+\/[\w.-]+)["']?\s*$/m);
  if (m) repos.push(m[1]);
}

for (const f of (await readdir(POSTS)).filter(f => f.endsWith(".mdx"))) {
  const text = await readFile(`${POSTS}/${f}`, "utf8");
  for (const m of text.matchAll(/<RepoCard\s+repo="([\w.-]+\/[\w.-]+)"/g)) {
    if (!repos.some(r => r.toLowerCase() === m[1].toLowerCase())) repos.push(m[1]);
  }
}

const previous = JSON.parse(await readFile(OUT, "utf8").catch(() => "[]"));
const byRepo = new Map(previous.map(r => [r.repo.toLowerCase(), r]));
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "urielpapa.com-update-repos",
  ...(process.env.GITHUB_TOKEN && {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }),
};

const out = [];
for (const repo of repos.sort()) {
  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!res.ok) {
    console.warn(`${repo}: HTTP ${res.status}, keeping the saved details`);
    out.push(byRepo.get(repo.toLowerCase()) ?? { repo, description: null, language: null, license: null, stars: null, readme: null });
    continue;
  }
  const d = await res.json();
  const rd = await fetch(`https://api.github.com/repos/${repo}/readme`, {
    headers: { ...headers, Accept: "application/vnd.github.raw" },
  });
  const readme = rd.ok
    ? readmeGlimpse(await rd.text())
    : (byRepo.get(repo.toLowerCase())?.readme ?? null);
  if (!rd.ok) console.warn(`${repo}: README HTTP ${rd.status}, keeping the saved glimpse`);
  out.push({
    repo: d.full_name,
    description: d.description ?? null,
    language: d.language ?? null,
    license: d.license?.spdx_id && d.license.spdx_id !== "NOASSERTION" ? d.license.spdx_id : null,
    stars: d.stargazers_count ?? null,
    readme,
  });
  console.log(`${repo}: ok`);
}
await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} repos to ${OUT}`);
