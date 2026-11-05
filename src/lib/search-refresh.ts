/**
 * The dashboard's "Refresh search data" button: reads Google Search Console
 * (Search Analytics and URL Inspection) and Bing Webmaster Tools through
 * their APIs, then commits src/data/search-console.json to GitHub. Vercel
 * redeploys on that commit and the dashboard shows the new numbers.
 *
 * Needs three secrets in Vercel (README, "The private dashboard"):
 * GSC_SERVICE_ACCOUNT_JSON, BING_WEBMASTER_API_KEY and GITHUB_DATA_TOKEN.
 * A source without its key keeps its previous numbers.
 */
import { createSign } from "node:crypto";
import {
  BING_WEBMASTER_API_KEY,
  GITHUB_DATA_TOKEN,
  GSC_SERVICE_ACCOUNT_JSON,
} from "astro:env/server";
import { SITE } from "@/config";
import type { SearchConsole } from "@/lib/dashboard";

const PROPERTY = `${SITE.url}/`;
const REPO = "Edamuza/urielpapa.com";
const DATA_FILE = "src/data/search-console.json";
const BRANCH = "main";

/** Which keys are set, for the button's setup note. */
export function refreshSetup() {
  const missing = [
    !GSC_SERVICE_ACCOUNT_JSON && "GSC_SERVICE_ACCOUNT_JSON",
    !BING_WEBMASTER_API_KEY && "BING_WEBMASTER_API_KEY",
    !GITHUB_DATA_TOKEN && "GITHUB_DATA_TOKEN",
  ].filter(Boolean) as string[];
  return {
    missing,
    ready:
      Boolean(GITHUB_DATA_TOKEN) &&
      Boolean(GSC_SERVICE_ACCOUNT_JSON || BING_WEBMASTER_API_KEY),
  };
}

const manilaDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** Runs `fn` over `items`, `limit` at a time. */
async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* Google Search Console                                              */
/* ------------------------------------------------------------------ */

/** OAuth access token for the service account (read-only Search Console scope). */
async function googleToken() {
  const sa = JSON.parse(GSC_SERVICE_ACCOUNT_JSON!) as {
    client_email: string;
    private_key: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(sa.private_key)
    .toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok)
    throw new Error(
      `Google sign-in failed (${res.status}): ${await res.text()}`
    );
  return ((await res.json()) as { access_token: string }).access_token;
}

type GscRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

async function searchAnalytics(
  token: string,
  body: Record<string, unknown>
): Promise<GscRow[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok)
    throw new Error(
      `Search Console search analytics failed (${res.status}): ${await res.text()}`
    );
  return ((await res.json()) as { rows?: GscRow[] }).rows ?? [];
}

type Inspection = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      lastCrawlTime?: string;
    };
  };
};

async function inspect(token: string, path: string) {
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: SITE.url + (path === "/" ? "/" : path),
        siteUrl: PROPERTY,
      }),
    }
  );
  if (!res.ok) return { path, state: `Inspection failed (${res.status})` };
  const r = ((await res.json()) as Inspection).inspectionResult
    ?.indexStatusResult;
  return {
    path,
    indexed: r?.verdict === "PASS",
    state: r?.coverageState ?? "Unknown",
    lastCrawled: r?.lastCrawlTime?.slice(0, 10) ?? null,
  };
}

async function readGoogle(
  pages: string[],
  previous: SearchConsole["google"]
): Promise<SearchConsole["google"]> {
  const token = await googleToken();
  // Search Console data lags a day or two; ask for the last 28 full days.
  const from = manilaDay(-28);
  const to = manilaDay(-1);
  const base = { startDate: from, endDate: to, type: "web" };
  const [totals, queries, pageRows] = await Promise.all([
    searchAnalytics(token, base),
    searchAnalytics(token, { ...base, dimensions: ["query"], rowLimit: 1000 }),
    searchAnalytics(token, { ...base, dimensions: ["page"], rowLimit: 1000 }),
  ]);
  const t = totals[0];
  const row = (r: GscRow) => ({
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: round(r.ctr, 4),
    position: round(r.position, 1),
  });
  const inspected = await pool(pages, 8, p => inspect(token, p));
  const reasons = new Map<
    string,
    { path: string; lastCrawled: string | null }[]
  >();
  for (const i of inspected) {
    if (i.indexed) continue;
    const list = reasons.get(i.state) ?? [];
    list.push({ path: i.path, lastCrawled: i.lastCrawled ?? null });
    reasons.set(i.state, list);
  }
  return {
    checkedOn: manilaDay(),
    indexing: {
      lastUpdated: manilaDay(),
      indexed: inspected.filter(i => i.indexed).length,
      notIndexed: inspected.filter(i => !i.indexed).length,
      reasons: [...reasons].map(([reason, urls]) => ({ reason, urls })),
    },
    performance: {
      from,
      to,
      clicks: t?.clicks ?? 0,
      impressions: t?.impressions ?? 0,
      ctr: round(t?.ctr ?? 0, 4),
      position: round(t?.position ?? 0, 1),
      queryCount: queries.length,
      pageCount: pageRows.length,
      queries: queries
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 100)
        .map(r => ({ query: r.keys?.[0] ?? "", ...row(r) })),
      pages: pageRows
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 50)
        .map(r => ({
          path:
            (r.keys?.[0] ?? "")
              .replace(/^https?:\/\/(www\.)?urielpapa\.com/i, "")
              .replace(/\/$/, "") || "/",
          ...row(r),
        })),
    },
    // Search Console's API doesn't list past indexing requests; keep what was recorded.
    requested: previous.requested,
  };
}

/* ------------------------------------------------------------------ */
/* Bing Webmaster Tools                                               */
/* ------------------------------------------------------------------ */

/** Bing's JSON dates look like "/Date(1730764800000-0800)/". */
const bingDate = (d: string) => {
  const ms = /\/Date\((-?\d+)/.exec(d)?.[1];
  return ms
    ? new Date(Number(ms)).toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      })
    : "";
};

async function bingCall<T>(method: string): Promise<T[]> {
  const url = `https://ssl.bing.com/webmaster/api.svc/json/${method}?siteUrl=${encodeURIComponent(PROPERTY)}&apikey=${BING_WEBMASTER_API_KEY}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  if (!res.ok)
    throw new Error(
      `Bing ${method} failed (${res.status}): ${await res.text()}`
    );
  const body = (await res.json()) as { d?: T[] };
  return body.d ?? [];
}

async function readBing(): Promise<SearchConsole["bing"]> {
  const from = manilaDay(-28);
  const to = manilaDay(-1);
  const [traffic, crawl] = await Promise.all([
    bingCall<{ Date: string; Clicks: number; Impressions: number }>(
      "GetRankAndTrafficStats"
    ),
    bingCall<{ Date: string; InIndex?: number }>("GetCrawlStats"),
  ]);
  const inWindow = traffic.filter(r => {
    const d = bingDate(r.Date);
    return d >= from && d <= to;
  });
  const latest = [...crawl]
    .filter(r => typeof r.InIndex === "number")
    .sort((a, b) => bingDate(b.Date).localeCompare(bingDate(a.Date)))[0];
  return {
    checkedOn: manilaDay(),
    from,
    to,
    clicks: inWindow.reduce((s, r) => s + (r.Clicks ?? 0), 0),
    impressions: inWindow.reduce((s, r) => s + (r.Impressions ?? 0), 0),
    indexed: latest?.InIndex ?? null,
    notes: latest
      ? `Pages in Bing's index as of ${bingDate(latest.Date)}.`
      : "Bing reported no crawl data yet.",
  };
}

/* ------------------------------------------------------------------ */
/* Save                                                               */
/* ------------------------------------------------------------------ */

async function commitSnapshot(data: SearchConsole) {
  const api = `https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_DATA_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "urielpapa.com-dashboard",
  };
  const current = await fetch(`${api}?ref=${BRANCH}`, { headers });
  if (!current.ok)
    throw new Error(
      `Reading ${DATA_FILE} on GitHub failed (${current.status}): ${await current.text()}`
    );
  const { sha } = (await current.json()) as { sha: string };
  const res = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Dashboard: refresh Search Console and Bing numbers",
      content: Buffer.from(JSON.stringify(data, null, 2) + "\n").toString(
        "base64"
      ),
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok)
    throw new Error(
      `Saving ${DATA_FILE} to GitHub failed (${res.status}): ${await res.text()}`
    );
}

/** Reads both sources, commits the snapshot, and says what changed. */
export async function refreshSearchData(
  pages: string[],
  previous: SearchConsole
) {
  const notes: string[] = [];
  let google = previous.google;
  let bing = previous.bing;
  if (GSC_SERVICE_ACCOUNT_JSON) {
    google = await readGoogle(pages, previous.google);
    notes.push(
      `Google: ${google.indexing.indexed} of ${pages.length} pages indexed, ${google.performance.clicks} clicks.`
    );
  } else notes.push("Google skipped: GSC_SERVICE_ACCOUNT_JSON is not set.");
  if (BING_WEBMASTER_API_KEY) {
    bing = await readBing();
    notes.push(`Bing: ${bing.clicks} clicks, ${bing.indexed ?? "–"} indexed.`);
  } else notes.push("Bing skipped: BING_WEBMASTER_API_KEY is not set.");
  await commitSnapshot({ google, bing });
  return notes;
}
