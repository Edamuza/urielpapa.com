/**
 * The dashboard's "Refresh search data" button: reads Google Search Console
 * (Search Analytics and URL Inspection) and Bing Webmaster Tools through
 * their APIs, then commits src/data/search-console.json to GitHub. Vercel
 * redeploys on that commit and the dashboard shows the new numbers.
 *
 * Also reads Microsoft Clarity's Data Export API when CLARITY_API_TOKEN is
 * set.
 *
 * Secrets in Vercel (README, "The private dashboard"): GITHUB_DATA_TOKEN to
 * save, plus any of GSC_SERVICE_ACCOUNT_JSON, BING_WEBMASTER_API_KEY and
 * CLARITY_API_TOKEN. A source without its key, or one that fails, keeps its
 * previous numbers.
 *
 * Vercel stops the function after 60 seconds, so URL Inspections run until
 * INSPECT_BUDGET_MS and the rest wait for the next refresh.
 */
import { createSign } from "node:crypto";
import {
  BING_WEBMASTER_API_KEY,
  CLARITY_API_TOKEN,
  GITHUB_DATA_TOKEN,
  GSC_SERVICE_ACCOUNT_JSON,
} from "astro:env/server";
import { SITE } from "@/config";
import type {
  ClarityMetric,
  ClaritySnapshot,
  PageInspection,
  SearchConsole,
} from "@/lib/dashboard";

const PROPERTY = `${SITE.url}/`;
const REPO = "Edamuza/urielpapa.com";
const DATA_FILE = "src/data/search-console.json";
const BRANCH = "main";
/** URL Inspections stop starting new pages after this long. */
const INSPECT_BUDGET_MS = 36_000;
/** No single API call may hang the refresh past Vercel's limit. */
const TIMEOUT_MS = 12_000;
const timeout = () => AbortSignal.timeout(TIMEOUT_MS);

/** Which keys are set, for the button's setup note. */
export function refreshSetup() {
  const missing = [
    !GSC_SERVICE_ACCOUNT_JSON && "GSC_SERVICE_ACCOUNT_JSON",
    !BING_WEBMASTER_API_KEY && "BING_WEBMASTER_API_KEY",
    !CLARITY_API_TOKEN && "CLARITY_API_TOKEN",
    !GITHUB_DATA_TOKEN && "GITHUB_DATA_TOKEN",
  ].filter(Boolean) as string[];
  return {
    missing,
    ready:
      Boolean(GITHUB_DATA_TOKEN) &&
      Boolean(
        GSC_SERVICE_ACCOUNT_JSON || BING_WEBMASTER_API_KEY || CLARITY_API_TOKEN
      ),
  };
}

const manilaDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/**
 * Runs `fn` over `items`, `limit` at a time, starting no new item after
 * `until` (a Date.now() time). Items never started stay undefined.
 */
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<R>,
  until = Infinity
) {
  const out: (R | undefined)[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length && Date.now() < until) {
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

/** One step of a refresh, for the dashboard's progress bar. */
export type RefreshStep = {
  /** What is happening now, in plain words. */
  label: string;
  /** Rough share of the whole refresh that is done, 0 to 100. */
  percent: number;
};

/**
 * The service account from GSC_SERVICE_ACCOUNT_JSON, with a plain-words error
 * when the value is not the whole downloaded key file.
 */
function serviceAccount() {
  const fix =
    "GSC_SERVICE_ACCOUNT_JSON must be the whole downloaded .json key file, from the first { to the last }.";
  let sa: unknown;
  try {
    sa = JSON.parse(GSC_SERVICE_ACCOUNT_JSON!.trim());
  } catch {
    throw new Error(`${fix} The value in Vercel is not valid JSON.`);
  }
  const { client_email, private_key } = (sa ?? {}) as Record<string, unknown>;
  if (typeof sa === "string" && sa.includes("PRIVATE KEY"))
    throw new Error(`${fix} The value in Vercel is only the private key.`);
  if (typeof client_email !== "string" || typeof private_key !== "string")
    throw new Error(
      `${fix} The value in Vercel has no client_email or private_key.`
    );
  return { client_email, private_key };
}

/** OAuth access token for the service account (read-only Search Console scope). */
async function googleToken() {
  const sa = serviceAccount();
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
    signal: timeout(),
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
      signal: timeout(),
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
    /** Google's own link to this URL's inspection in Search Console. */
    inspectionResultLink?: string;
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      lastCrawlTime?: string;
    };
  };
};

/** One page's index status, or null when the inspection failed. */
async function inspect(
  token: string,
  path: string
): Promise<PageInspection | null> {
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      signal: timeout(),
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
  if (!res.ok) return null;
  const result = ((await res.json()) as Inspection).inspectionResult;
  const r = result?.indexStatusResult;
  const link = result?.inspectionResultLink;
  return {
    indexed: r?.verdict === "PASS",
    state: r?.coverageState ?? "Unknown",
    lastCrawled: r?.lastCrawlTime?.slice(0, 10) ?? null,
    checked: manilaDay(),
    ...(link?.startsWith("https://search.google.com/") ? { link } : {}),
  };
}

async function readGoogle(
  pages: string[],
  previous: SearchConsole["google"],
  previousInspections: Record<string, PageInspection>,
  step: (s: RefreshStep) => void,
  until: number
): Promise<{
  google: SearchConsole["google"];
  inspections: Record<string, PageInspection>;
  checkedNow: number;
}> {
  step({ label: "Signing in to Google", percent: 3 });
  const token = await googleToken();
  step({
    label: "Reading clicks and keywords from Search Console",
    percent: 8,
  });
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
  // The URL Inspections are most of the wait (12% to 85% of the bar). Pages
  // never checked come first, then the ones checked longest ago.
  const order = [...pages].sort((a, b) =>
    (previousInspections[a]?.checked ?? "").localeCompare(
      previousInspections[b]?.checked ?? ""
    )
  );
  const started = Date.now();
  let checked = 0;
  const report = () =>
    step({
      label: `Checking index status in Google: ${checked} of ${pages.length} pages`,
      percent:
        12 +
        Math.round(
          73 *
            Math.max(
              checked / pages.length,
              Math.min(1, (Date.now() - started) / (until - started))
            )
        ),
    });
  report();
  const results = await pool(
    order,
    12,
    async p => {
      const result = await inspect(token, p).catch(() => null);
      checked++;
      report();
      return result;
    },
    until
  );
  // Keep earlier results for pages not checked (or failed) this time; drop
  // pages no longer in the sitemap.
  const inspections: Record<string, PageInspection> = {};
  let checkedNow = 0;
  order.forEach((p, i) => {
    const fresh = results[i];
    if (fresh) checkedNow++;
    const kept = fresh ?? previousInspections[p];
    if (kept) inspections[p] = kept;
  });
  const known = Object.entries(inspections);
  const reasons = new Map<
    string,
    { path: string; lastCrawled: string | null }[]
  >();
  for (const [path, i] of known) {
    if (i.indexed) continue;
    const list = reasons.get(i.state) ?? [];
    list.push({ path, lastCrawled: i.lastCrawled });
    reasons.set(i.state, list);
  }
  // The indexing queue lists pages published after lastUpdated, so use the
  // oldest check: nothing newer than it is missed.
  const oldest =
    known.map(([, i]) => i.checked).sort()[0] ??
    previous.indexing.lastUpdated ??
    manilaDay();
  const google: SearchConsole["google"] = {
    checkedOn: manilaDay(),
    indexing: {
      lastUpdated: oldest,
      indexed: known.filter(([, i]) => i.indexed).length,
      notIndexed: known.filter(([, i]) => !i.indexed).length,
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
  return { google, inspections, checkedNow };
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
    signal: timeout(),
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  if (!res.ok)
    throw new Error(
      `Bing ${method} failed (${res.status}): ${(await res.text()).slice(0, 200)}`
    );
  const body = (await res.json()) as { d?: T[] };
  return body.d ?? [];
}

/** A Bing POST call, e.g. SubmitFeed. */
async function bingPost(method: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://ssl.bing.com/webmaster/api.svc/json/${method}?apikey=${BING_WEBMASTER_API_KEY}`,
    {
      method: "POST",
      signal: timeout(),
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok)
    throw new Error(
      `Bing ${method} failed (${res.status}): ${(await res.text()).slice(0, 200)}`
    );
}

type BingCrawlRow = {
  Date: string;
  CrawledPages?: number;
  InIndex?: number;
  CrawlErrors?: number;
  BlockedByRobotsTxt?: number;
  Code2xx?: number;
  Code301?: number;
  Code302?: number;
  Code4xx?: number;
  Code5xx?: number;
  ConnectionTimeout?: number;
  DnsFailures?: number;
  InLinks?: number;
};

type BingFeed = {
  Url: string;
  Status?: string;
  Submitted?: string;
  LastCrawled?: string;
  UrlCount?: number;
};

type BingIssue = { Url: string; HttpCode?: number; Issues?: number | string };

/** Bing's UrlIssues flags, in plain words. */
const BING_ISSUES: [number, string][] = [
  [1, "HTTP code 301"],
  [2, "HTTP code 302"],
  [4, "HTTP 4xx error"],
  [8, "HTTP 5xx error"],
  [16, "blocked by robots.txt"],
  [32, "contains malware"],
  [64, "important URL blocked by robots.txt"],
  [128, "DNS error"],
  [256, "timed out"],
];
const issueWords = (v: number | string | undefined) => {
  if (typeof v === "string") return v;
  const words = BING_ISSUES.filter(([bit]) => (v ?? 0) & bit).map(([, w]) => w);
  return words.join(", ") || "unknown issue";
};

const SITEMAP = `${SITE.url}/sitemap-index.xml`;

async function readBing(): Promise<SearchConsole["bing"]> {
  const from = manilaDay(-28);
  const to = manilaDay(-1);
  const [traffic, crawl, feeds, issues] = await Promise.all([
    bingCall<{ Date: string; Clicks: number; Impressions: number }>(
      "GetRankAndTrafficStats"
    ),
    bingCall<BingCrawlRow>("GetCrawlStats"),
    bingCall<BingFeed>("GetFeeds").catch(() => [] as BingFeed[]),
    bingCall<BingIssue>("GetCrawlIssues").catch(() => [] as BingIssue[]),
  ]);
  const inWindow = traffic.filter(r => {
    const d = bingDate(r.Date);
    return d >= from && d <= to;
  });
  const days = [...crawl]
    .filter(r => bingDate(r.Date))
    .sort((a, b) => bingDate(a.Date).localeCompare(bingDate(b.Date)));
  const latest = [...days].reverse().find(r => typeof r.InIndex === "number");
  const n = (v: number | undefined) => v ?? 0;

  // A sitemap Bing has never been given is the most common reason it
  // finds few pages, so submit it once when it is missing.
  const actions: string[] = [];
  const hasSitemap = feeds.some(f => /sitemap/i.test(f.Url));
  if (!hasSitemap) {
    try {
      await bingPost("SubmitFeed", { siteUrl: PROPERTY, feedUrl: SITEMAP });
      actions.push(`Submitted ${SITEMAP} to Bing (it had no sitemap).`);
    } catch (e) {
      actions.push(
        `Bing has no sitemap, and submitting it failed: ${String(e instanceof Error ? e.message : e).slice(0, 160)}`
      );
    }
  }

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
    crawl: latest
      ? {
          date: bingDate(latest.Date),
          crawledPages: n(latest.CrawledPages),
          inIndex: n(latest.InIndex),
          crawlErrors: n(latest.CrawlErrors),
          blockedByRobots: n(latest.BlockedByRobotsTxt),
          code2xx: n(latest.Code2xx),
          code3xx: n(latest.Code301) + n(latest.Code302),
          code4xx: n(latest.Code4xx),
          code5xx: n(latest.Code5xx),
          timeouts: n(latest.ConnectionTimeout),
          dnsFailures: n(latest.DnsFailures),
          inLinks: n(latest.InLinks),
        }
      : null,
    history: days.slice(-30).map(r => ({
      date: bingDate(r.Date),
      inIndex: n(r.InIndex),
      crawled: n(r.CrawledPages),
    })),
    sitemaps: feeds.map(f => ({
      url: f.Url,
      status: f.Status ?? "",
      submitted: f.Submitted ? bingDate(f.Submitted) : "",
      lastCrawled: f.LastCrawled ? bingDate(f.LastCrawled) : "",
      urlCount: f.UrlCount ?? null,
    })),
    issues: issues.slice(0, 25).map(i => ({
      url: i.Url,
      httpCode: i.HttpCode ?? null,
      issues: issueWords(i.Issues),
    })),
    actions,
  };
}

/* ------------------------------------------------------------------ */
/* Microsoft Clarity                                                  */
/* ------------------------------------------------------------------ */

/** Clarity allows 1 to 3 days back; take the most. */
const CLARITY_DAYS = 3;

type ClarityRow = Record<string, string | number | null>;

/**
 * One Data Export call. Clarity allows 10 calls a day per project, and a
 * refresh makes 3 (site-wide, by page, by device), so about 3 refreshes a
 * day can include Clarity.
 */
async function clarityCall(dimension?: string) {
  const params = new URLSearchParams({ numOfDays: String(CLARITY_DAYS) });
  if (dimension) params.set("dimension1", dimension);
  const res = await fetch(
    `https://www.clarity.ms/export-data/api/v1/project-live-insights?${params}`,
    {
      signal: timeout(),
      headers: {
        Authorization: `Bearer ${CLARITY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (res.status === 429)
    throw new Error(
      "Clarity's limit of 10 calls a day is used up; its numbers refresh again tomorrow."
    );
  if (!res.ok)
    throw new Error(
      `Clarity failed (${res.status}): ${(await res.text()).slice(0, 200)}`
    );
  return (await res.json()) as {
    metricName: string;
    information?: ClarityRow[];
  }[];
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** The numeric fields of a row, e.g. { totalSessionCount: 120 }. */
const numbers = (row: ClarityRow | undefined) =>
  Object.fromEntries(
    Object.entries(row ?? {})
      .map(([k, v]) => [k, num(v)] as const)
      .filter((e): e is readonly [string, number] => e[1] !== null)
  );

const traffic = (data: Awaited<ReturnType<typeof clarityCall>>): ClarityRow[] =>
  data.find(m => m.metricName.replace(/\s/g, "").toLowerCase() === "traffic")
    ?.information ?? [];

/** Distinct users: Clarity's sample spells it distantUserCount. */
const users = (r: ClarityRow) => num(r.distinctUserCount ?? r.distantUserCount);

async function readClarity(): Promise<ClaritySnapshot> {
  const [site, byUrl, byDevice] = await Promise.all([
    clarityCall(),
    clarityCall("URL"),
    clarityCall("Device"),
  ]);
  const metrics: ClarityMetric[] = site.map(m => ({
    name: m.metricName,
    values: numbers(m.information?.[0]),
  }));
  const pages = traffic(byUrl)
    .map(r => ({
      url: String(r.URL ?? r.Url ?? ""),
      sessions: num(r.totalSessionCount) ?? 0,
      users: users(r),
    }))
    .filter(r => r.url)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 25);
  const devices = traffic(byDevice)
    .map(r => ({
      device: String(r.Device ?? "Other"),
      sessions: num(r.totalSessionCount) ?? 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
  return {
    checkedOn: manilaDay(),
    days: CLARITY_DAYS,
    metrics,
    pages,
    devices,
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
  const current = await fetch(`${api}?ref=${BRANCH}`, {
    headers,
    signal: timeout(),
  });
  if (!current.ok)
    throw new Error(
      `Reading ${DATA_FILE} on GitHub failed (${current.status}): ${await current.text()}`
    );
  const { sha } = (await current.json()) as { sha: string };
  const res = await fetch(api, {
    method: "PUT",
    headers,
    signal: timeout(),
    body: JSON.stringify({
      message: "Dashboard: refresh search and Clarity numbers",
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
  return ((await res.json()) as { commit?: { sha?: string } }).commit?.sha;
}

/** A source's error message, cut short for the result note. */
const why = (e: unknown) =>
  String(e instanceof Error ? e.message : e).slice(0, 220);

/**
 * Reads every source that has a key, at the same time, commits the snapshot,
 * and says what changed. A source that fails keeps its previous numbers and
 * is listed in `failed`. `step` hears about each stage, for the dashboard's
 * progress bar.
 */
export async function refreshSearchData(
  pages: string[],
  previous: SearchConsole,
  step: (s: RefreshStep) => void = () => {}
) {
  const until = Date.now() + INSPECT_BUDGET_MS;
  const notes: string[] = [];
  const failed: string[] = [];
  const next: SearchConsole = { ...previous };

  const google = GSC_SERVICE_ACCOUNT_JSON
    ? readGoogle(
        pages,
        previous.google,
        previous.inspections ?? {},
        step,
        until
      )
    : undefined;
  const bing = BING_WEBMASTER_API_KEY ? readBing() : undefined;
  const clarity = CLARITY_API_TOKEN ? readClarity() : undefined;

  const [g, b, c] = await Promise.allSettled([google, bing, clarity]);
  step({ label: "Saving the new numbers to GitHub", percent: 94 });

  if (!google) notes.push("Google skipped: no key.");
  else if (g.status === "rejected") failed.push(`Google: ${why(g.reason)}`);
  else if (g.value) {
    next.google = g.value.google;
    next.inspections = g.value.inspections;
    const known = Object.keys(g.value.inspections).length;
    notes.push(
      `Google: checked ${g.value.checkedNow} pages this time; ${g.value.google.indexing.indexed} of ${pages.length} indexed` +
        (known < pages.length
          ? `, ${pages.length - known} not checked yet (the next refresh continues).`
          : ".")
    );
  }
  if (!bing) notes.push("Bing skipped: no key.");
  else if (b.status === "rejected") failed.push(`Bing: ${why(b.reason)}`);
  else if (b.value) {
    next.bing = b.value;
    notes.push(
      `Bing: ${b.value.clicks} clicks, ${b.value.indexed ?? "–"} indexed.`,
      ...(b.value.actions ?? [])
    );
  }
  if (!clarity) notes.push("Clarity skipped: no CLARITY_API_TOKEN.");
  else if (c.status === "rejected") failed.push(`Clarity: ${why(c.reason)}`);
  else if (c.value) {
    next.clarity = c.value;
    const sessions =
      c.value.metrics.find(m => /traffic/i.test(m.name))?.values
        .totalSessionCount ?? 0;
    notes.push(`Clarity: ${sessions} sessions in the last 3 days.`);
  }

  const read = [google && g, bing && b, clarity && c].filter(
    r => r && r.status === "fulfilled"
  ).length;
  if (!read)
    throw new Error(failed.join(" ") || "No source has a key in Vercel.");
  const commit = await commitSnapshot(next);
  return { notes, failed, commit };
}
