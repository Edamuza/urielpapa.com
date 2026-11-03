// GitHub repository details for the project pages' repo cards.
//
// Builds read the saved snapshot in repos.json, so they never depend on the
// network. When GITHUB_TOKEN is set (for example in Vercel's environment), the
// build also asks the GitHub API for fresh details and falls back to the
// snapshot if that fails. Refresh the snapshot with `node scripts/update-repos.mjs`.
import snapshot from "./repos.json";

export type RepoInfo = {
  repo: string; // "owner/name"
  owner: string;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  license: string | null;
  stars: number | null;
};

type Snapshot = {
  repo: string;
  description: string | null;
  language: string | null;
  license: string | null;
  stars: number | null;
};

const saved = new Map(
  (snapshot as Snapshot[]).map(r => [r.repo.toLowerCase(), r])
);
const cache = new Map<string, Promise<RepoInfo>>();

async function fetchLive(repo: string): Promise<Snapshot | undefined> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return undefined;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "urielpapa.com-build",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return undefined;
    const d = await res.json();
    return {
      repo: d.full_name,
      description: d.description ?? null,
      language: d.language ?? null,
      license:
        d.license?.spdx_id && d.license.spdx_id !== "NOASSERTION"
          ? d.license.spdx_id
          : null,
      stars: typeof d.stargazers_count === "number" ? d.stargazers_count : null,
    };
  } catch {
    return undefined;
  }
}

export function getRepo(repo: string): Promise<RepoInfo> {
  const key = repo.toLowerCase();
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const data = (await fetchLive(repo)) ?? saved.get(key);
      const full = data?.repo ?? repo;
      const [owner, name] = full.split("/");
      return {
        repo: full,
        owner,
        name,
        url: `https://github.com/${full}`,
        description: data?.description ?? null,
        language: data?.language ?? null,
        license: data?.license ?? null,
        stars: data?.stars ?? null,
      };
    })();
    cache.set(key, hit);
  }
  return hit;
}
